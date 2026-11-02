'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import yaml from 'js-yaml';
import {
  FileCode,
  ListTree,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Download,
  Search,
  Check,
  RotateCcw,
  RefreshCw,
  FolderOpen,
  Folder,
  AlertCircle,
  CheckCircle2,
  Info,
  Maximize2,
  Minimize2,
  Eye,
  Edit3,
  ExternalLink,
  Code2,
  FileText,
  CornerDownRight
} from 'lucide-react';

// 预置默认 YAML 示例数据 (包含 proxies 数组、vmess / vless 节点、Unicode 转义和 Emoji 节点名)
const DEFAULT_YAML = `port: 7890
socks-port: 7891
allow-lan: true
mode: Rule
log-level: info
external-controller: 127.0.0.1:9090

proxies:
  - name: "🇭🇰 香港 01 - 专线 [BGP]"
    type: vmess
    server: hk01.example.com
    port: 443
    uuid: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    alterId: 0
    cipher: auto
    tls: true
    network: ws
  - name: "🇭🇰 香港 02 - 高速 [BGP]"
    type: vless
    server: hk02.example.com
    port: 443
    uuid: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e"
    tls: true
    network: grpc
  - name: "🇳🇱 荷兰 01 - 国际宽带"
    type: vmess
    server: nl01.example.com
    port: 443
    uuid: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f"
    alterId: 0
    cipher: auto
    tls: false
  - name: "\\u0001F1ED 香港 03 - 备用节点"
    type: vmess
    server: hk03.example.com
    port: 8443
    uuid: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90"
    alterId: 0
    cipher: auto
    tls: true

proxy-groups:
  - name: "节点选择"
    type: select
    proxies:
      - "🇭🇰 香港 01 - 专线 [BGP]"
      - "🇭🇰 香港 02 - 高速 [BGP]"
      - "🇳🇱 荷兰 01 - 国际宽带"
      - "\\u0001F1ED 香港 03 - 备用节点"
  - name: "自动测速"
    type: url-test
    url: "http://www.gstatic.com/generate_204"
    interval: 300
    proxies:
      - "🇭🇰 香港 01 - 专线 [BGP]"
      - "🇭🇰 香港 02 - 高速 [BGP]"

rules:
  - "DOMAIN-SUFFIX,google.com,节点选择"
  - "DOMAIN-KEYWORD,github,节点选择"
  - "GEOIP,CN,DIRECT"
  - "MATCH,节点选择"
`;

type ValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

interface SearchResultItem {
  id: string;
  path: (string | number)[];
  pathStr: string;
  key: string;
  value: any;
  parentIsArray: boolean;
  arrayPath?: (string | number)[];
  arrayIndex?: number;
}

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

function getInitialYamlState() {
  try {
    const data = yaml.load(DEFAULT_YAML);
    const dumped = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });
    const defaultExpanded = new Set<string>(['root']);
    if (data && typeof data === 'object') {
      const obj = data as Record<string, any>;
      Object.keys(obj).forEach((k) => {
        defaultExpanded.add(k);
        if (Array.isArray(obj[k]) && obj[k].length > 0) {
          defaultExpanded.add(`${k}.0`);
        }
      });
    }
    return { data, dumped, defaultExpanded };
  } catch {
    return { data: null, dumped: '', defaultExpanded: new Set<string>(['root']) };
  }
}

const INITIAL_YAML_STATE = getInitialYamlState();

export default function YamlNodeEditorPage() {
  // 输入与解析状态
  const [yamlInput, setYamlInput] = useState(DEFAULT_YAML);
  const [parsedData, setParsedData] = useState<any>(INITIAL_YAML_STATE.data);
  const [yamlOutput, setYamlOutput] = useState(INITIAL_YAML_STATE.dumped);
  const [parseError, setParseError] = useState<string | null>(null);

  // 展开折叠集合 (存储节点路径字符串，如 "root", "proxies", "proxies.0")
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(INITIAL_YAML_STATE.defaultExpanded);

  // 搜索相关状态
  const [searchKey, setSearchKey] = useState('name');
  const [searchRegex, setSearchRegex] = useState('香港|荷兰|\\u0001F1ED');
  const [searchIgnoreCase, setSearchIgnoreCase] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // 高亮定位节点
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null);

  // 弹窗或内联新增子节点状态
  const [addModalPath, setAddModalPath] = useState<(string | number)[] | null>(null);
  const [newChildKey, setNewChildKey] = useState('');
  const [newChildType, setNewChildType] = useState<ValueType>('string');
  const [newChildValue, setNewChildValue] = useState('');

  // 复制反馈与 Toast
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const id = Date.now();
    setToast({ id, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2800);
  }, []);

  // 解析当前输入框的 YAML
  const parseYamlInput = useCallback((silentSuccess = false) => {
    try {
      setParseError(null);
      if (!yamlInput.trim()) {
        setParsedData(null);
        setYamlOutput('');
        setSearchResults([]);
        if (!silentSuccess) showToast('YAML 输入为空', 'info');
        return;
      }
      const data = yaml.load(yamlInput);
      setParsedData(data);

      // 同步生成导出 YAML
      const dumped = yaml.dump(data, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });
      setYamlOutput(dumped);

      // 默认展开顶层键
      const defaultExpanded = new Set<string>(['root']);
      if (data && typeof data === 'object') {
        const obj = data as Record<string, any>;
        Object.keys(obj).forEach((k) => {
          defaultExpanded.add(k);
          if (Array.isArray(obj[k]) && obj[k].length > 0) {
            defaultExpanded.add(`${k}.0`);
          }
        });
      }
      setExpandedPaths(defaultExpanded);

      if (!silentSuccess) {
        showToast('已成功解析 YAML 并生成节点视图', 'success');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'YAML 解析失败，请检查语法格式';
      setParseError(msg);
      showToast(msg, 'error');
    }
  }, [yamlInput, showToast]);

  // 从当前 parsedData 同步重新导出 YAML 并更新输出区
  const syncExportFromData = useCallback((newData: any) => {
    try {
      const dumped = yaml.dump(newData, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });
      setYamlOutput(dumped);
    } catch (e: any) {
      console.error('导出 YAML 错误', e);
    }
  }, []);

  // 格式化当前 parsedData 生成 YAML
  const handleExportYaml = () => {
    if (parsedData === null || parsedData === undefined) {
      showToast('当前无有效节点数据可导出', 'error');
      return;
    }
    syncExportFromData(parsedData);
    showToast('已成功导出 YAML 到结果区', 'success');
  };

  // 一键下载 YAML 文件
  const handleDownloadYaml = () => {
    let content = yamlOutput;
    if (!content && parsedData !== null) {
      try {
        content = yaml.dump(parsedData, { indent: 2, lineWidth: -1, noRefs: true });
        setYamlOutput(content);
      } catch (e) {
        // ignore
      }
    }

    if (!content || !content.trim()) {
      showToast('暂无可下载的 YAML 内容', 'error');
      return;
    }

    try {
      const blob = new Blob([content], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'export.yaml';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('已开始下载 export.yaml', 'success');
    } catch (e: any) {
      showToast('下载失败: ' + (e?.message || '未知错误'), 'error');
    }
  };

  // 一键复制结果
  const handleCopyOutput = () => {
    if (!yamlOutput) {
      showToast('导出区暂无内容可复制', 'info');
      return;
    }
    navigator.clipboard.writeText(yamlOutput).then(
      () => showToast('已成功复制 YAML 到剪贴板', 'success'),
      () => showToast('复制失败，请手动选取复制', 'error')
    );
  };

  // 全部展开
  const handleExpandAll = () => {
    if (!parsedData) return;
    const all = new Set<string>(['root']);
    const collectPaths = (obj: any, currentPath: string) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const p = currentPath ? `${currentPath}.${index}` : `${index}`;
          all.add(p);
          collectPaths(item, p);
        });
      } else {
        Object.keys(obj).forEach((key) => {
          const p = currentPath ? `${currentPath}.${key}` : key;
          all.add(p);
          collectPaths(obj[key], p);
        });
      }
    };
    collectPaths(parsedData, '');
    setExpandedPaths(all);
    showToast(`已展开所有层级 (${all.size} 个节点分支)`, 'info');
  };

  // 全部折叠
  const handleCollapseAll = () => {
    setExpandedPaths(new Set(['root']));
    showToast('已折叠所有子层级', 'info');
  };

  // 辅助：深拷贝数据
  const cloneData = (data: any) => {
    if (data === undefined) return undefined;
    return JSON.parse(JSON.stringify(data));
  };

  // 原始类型智能解析器
  const parseRawValue = (str: string, targetType?: ValueType): any => {
    if (targetType === 'number') {
      const num = Number(str);
      return isNaN(num) ? str : num;
    }
    if (targetType === 'boolean') {
      return str === 'true';
    }
    if (targetType === 'null') {
      return null;
    }
    if (targetType === 'string') {
      return str;
    }

    // 自动类型推导
    const trimmed = str.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null' || trimmed === '~') return null;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      if (!isNaN(num)) return num;
    }
    return str;
  };

  // 搜索节点执行函数
  const executeSearch = useCallback((dataToSearch = parsedData) => {
    if (!dataToSearch) {
      setSearchResults([]);
      setHasSearched(true);
      showToast('暂无已解析的节点数据', 'info');
      return;
    }

    const keyName = searchKey.trim();
    if (!keyName) {
      showToast('请输入要搜索的 key 名称', 'error');
      return;
    }

    let regex: RegExp;
    try {
      const flags = searchIgnoreCase ? 'i' : '';
      regex = new RegExp(searchRegex, flags);
    } catch (e: any) {
      showToast('正则表达式语法错误: ' + e.message, 'error');
      return;
    }

    const matches: SearchResultItem[] = [];

    const traverse = (
      obj: any,
      path: (string | number)[],
      parentIsArray: boolean,
      arrayPath?: (string | number)[],
      arrayIndex?: number
    ) => {
      if (!obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          traverse(item, [...path, index], true, path, index);
        });
      } else {
        Object.entries(obj).forEach(([k, v]) => {
          const currentPath = [...path, k];
          if (k === keyName) {
            const valStr = String(v ?? '');
            if (!searchRegex.trim() || regex.test(valStr)) {
              const pathStr = currentPath.map((seg, i) => (typeof seg === 'number' ? `[${seg}]` : i === 0 ? seg : `.${seg}`)).join('');
              matches.push({
                id: `${pathStr}-${matches.length}`,
                path: currentPath,
                pathStr,
                key: k,
                value: v,
                parentIsArray,
                arrayPath,
                arrayIndex,
              });
            }
          }
          traverse(v, currentPath, false, arrayPath, arrayIndex);
        });
      }
    };

    traverse(dataToSearch, [], false);
    setSearchResults(matches);
    setHasSearched(true);
    if (matches.length === 0) {
      showToast('未找到匹配项', 'info');
    } else {
      showToast(`已搜索到 ${matches.length} 个匹配节点`, 'success');
    }
  }, [parsedData, searchKey, searchRegex, searchIgnoreCase, showToast]);

  // 更新节点值（支持任意层级路径）
  const updateNodeValue = (path: (string | number)[], newValue: any) => {
    const newData = cloneData(parsedData);
    let curr = newData;
    for (let i = 0; i < path.length - 1; i++) {
      curr = curr[path[i]];
      if (!curr) return;
    }
    const lastKey = path[path.length - 1];
    curr[lastKey] = newValue;
    setParsedData(newData);
    syncExportFromData(newData);

    // 同步更新搜索结果中的值
    setSearchResults((prev) =>
      prev.map((item) => {
        if (JSON.stringify(item.path) === JSON.stringify(path)) {
          return { ...item, value: newValue };
        }
        return item;
      })
    );
  };

  // 修改节点 Key
  const renameNodeKey = (parentPath: (string | number)[], oldKey: string, newKey: string) => {
    if (!newKey.trim()) {
      showToast('Key 键名不能为空', 'error');
      return false;
    }
    if (oldKey === newKey) return true;

    const newData = cloneData(parsedData);
    let parent = newData;
    for (const p of parentPath) {
      parent = parent[p];
      if (!parent) return false;
    }

    if (Object.prototype.hasOwnProperty.call(parent, newKey)) {
      showToast(`当前层级已存在键名 "${newKey}"，重命名将覆盖已有节点！`, 'error');
      return false;
    }

    // 重构对象键顺序
    const newParent: Record<string, any> = {};
    for (const k of Object.keys(parent)) {
      if (k === oldKey) {
        newParent[newKey] = parent[oldKey];
      } else {
        newParent[k] = parent[k];
      }
    }

    // 赋回父级
    if (parentPath.length === 0) {
      setParsedData(newParent);
      syncExportFromData(newParent);
    } else {
      let root = newData;
      for (let i = 0; i < parentPath.length - 1; i++) {
        root = root[parentPath[i]];
      }
      root[parentPath[parentPath.length - 1]] = newParent;
      setParsedData(newData);
      syncExportFromData(newData);
    }

    showToast(`键名已重命名为 "${newKey}"`, 'success');
    return true;
  };

  // 删除节点 (删除指定 key 或数组项)
  const deleteNode = (path: (string | number)[]) => {
    if (path.length === 0) return;
    const newData = cloneData(parsedData);
    let parent = newData;
    for (let i = 0; i < path.length - 1; i++) {
      parent = parent[path[i]];
      if (!parent) return;
    }

    const lastKey = path[path.length - 1];
    if (Array.isArray(parent) && typeof lastKey === 'number') {
      parent.splice(lastKey, 1);
    } else if (parent && typeof parent === 'object') {
      delete parent[lastKey];
    }

    setParsedData(newData);
    syncExportFromData(newData);
    showToast(`已删除节点 "${lastKey}"`, 'info');

    // 重新运行搜索刷新结果
    setTimeout(() => {
      executeSearch(newData);
    }, 50);
  };

  // 删除节点所在的整个数组元素
  const deleteEnclosingArrayItem = (arrayPath?: (string | number)[], arrayIndex?: number) => {
    if (!arrayPath || arrayIndex === undefined) {
      showToast('该节点不在数组元素内部，无法删除所在数组元素', 'error');
      return;
    }

    const newData = cloneData(parsedData);
    let targetArray = newData;
    for (const p of arrayPath) {
      targetArray = targetArray[p];
      if (!targetArray) return;
    }

    if (!Array.isArray(targetArray)) {
      showToast('定位父级数组失败', 'error');
      return;
    }

    targetArray.splice(arrayIndex, 1);
    setParsedData(newData);
    syncExportFromData(newData);
    showToast(`已删除整个数组元素 [${arrayIndex}]`, 'success');

    setTimeout(() => {
      executeSearch(newData);
    }, 50);
  };

  // 展开所有父节点并高亮定位
  const navigateToNodeInView = (path: (string | number)[]) => {
    const newExpanded = new Set(expandedPaths);
    let current = '';
    newExpanded.add('root');
    for (let i = 0; i < path.length - 1; i++) {
      const seg = path[i];
      current = current ? `${current}.${seg}` : String(seg);
      newExpanded.add(current);
    }
    setExpandedPaths(newExpanded);

    const fullPathStr = path.map((s) => String(s)).join('.');
    setHighlightedPath(fullPathStr);

    // 延迟平滑滚动定位
    setTimeout(() => {
      const el = document.getElementById(`node-element-${fullPathStr}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    // 3秒后移除高亮
    setTimeout(() => {
      setHighlightedPath((curr) => (curr === fullPathStr ? null : curr));
    }, 3200);

    showToast(`已定位并展开视图中的节点`, 'info');
  };

  // 添加子节点
  const handleConfirmAddChild = () => {
    if (!addModalPath) return;
    const newData = cloneData(parsedData);
    let target = newData;
    for (const p of addModalPath) {
      target = target[p];
      if (!target) return;
    }

    let initialVal: any = '';
    if (newChildType === 'number') initialVal = Number(newChildValue) || 0;
    else if (newChildType === 'boolean') initialVal = newChildValue === 'true';
    else if (newChildType === 'null') initialVal = null;
    else if (newChildType === 'object') initialVal = {};
    else if (newChildType === 'array') initialVal = [];
    else initialVal = newChildValue;

    if (Array.isArray(target)) {
      target.push(initialVal);
      showToast(`已向数组追加新元素`, 'success');
    } else if (target && typeof target === 'object') {
      const key = newChildKey.trim();
      if (!key) {
        showToast('子节点 Key 不能为空', 'error');
        return;
      }
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        showToast(`当前对象中已存在名为 "${key}" 的键`, 'error');
        return;
      }
      target[key] = initialVal;
      showToast(`已添加子节点 "${key}"`, 'success');
    }

    setParsedData(newData);
    syncExportFromData(newData);

    // 展开目标节点
    const pathStr = addModalPath.join('.');
    setExpandedPaths((prev) => new Set([...prev, pathStr || 'root']));

    // 关闭弹窗并重置
    setAddModalPath(null);
    setNewChildKey('');
    setNewChildValue('');
    setNewChildType('string');
  };

  // 递归渲染节点树
  const renderTreeItem = (
    value: any,
    keyOrIndex: string | number,
    path: (string | number)[],
    depth: number
  ) => {
    const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    const isArray = Array.isArray(value);
    const isContainer = isObject || isArray;
    const pathStr = path.join('.');
    const isExpanded = expandedPaths.has(pathStr);
    const isHighlighted = highlightedPath === pathStr;

    const toggleExpand = () => {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(pathStr)) {
          next.delete(pathStr);
        } else {
          next.add(pathStr);
        }
        return next;
      });
    };

    return (
      <div
        key={pathStr}
        id={`node-element-${pathStr}`}
        className={`relative transition-all duration-300 ${
          isHighlighted ? 'bg-amber-50 ring-2 ring-amber-400 rounded-md py-1 px-1 my-0.5' : ''
        }`}
        style={{ paddingLeft: depth > 0 ? '18px' : '0' }}
      >
        {/* 树枝缩进线 */}
        {depth > 0 && (
          <div
            className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-200 pointer-events-none"
            aria-hidden="true"
          />
        )}

        <div className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-slate-50 group text-sm min-h-[34px]">
          {/* 折叠/展开箭头 */}
          {isContainer ? (
            <button
              type="button"
              onClick={toggleExpand}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors focus:outline-none flex-shrink-0"
              title={isExpanded ? '折叠' : '展开'}
            >
              {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          ) : (
            <span className="w-6 flex-shrink-0 flex items-center justify-center text-slate-300">
              •
            </span>
          )}

          {/* Key 展示与编辑 */}
          {typeof keyOrIndex === 'number' ? (
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200 flex-shrink-0">
              [{keyOrIndex}]
            </span>
          ) : (
            <div className="flex items-center gap-1 flex-shrink-0">
              <input
                type="text"
                defaultValue={keyOrIndex}
                onBlur={(e) => {
                  const newK = e.target.value.trim();
                  if (newK !== keyOrIndex) {
                    const ok = renameNodeKey(path.slice(0, -1), keyOrIndex, newK);
                    if (!ok) e.target.value = keyOrIndex;
                  }
                }}
                className="font-mono text-xs font-semibold text-indigo-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-1.5 py-0.5 focus:outline-none transition-colors w-28 sm:w-36"
                title="点击修改 Key 键名"
              />
              <span className="text-slate-400 font-mono">:</span>
            </div>
          )}

          {/* 容器类型标签或叶子节点 Value 输入框 */}
          {isContainer ? (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                {isArray ? `Array (${value.length})` : `Object (${Object.keys(value).length})`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAddModalPath(path);
                  setNewChildType('string');
                  setNewChildKey('');
                  setNewChildValue('');
                }}
                className="opacity-0 group-hover:opacity-100 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1 transition-all"
                title="新增子节点"
              >
                <Plus size={12} />
                <span>子节点</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 min-w-0">
              {/* 区分布尔、数值、字符串或 null */}
              {typeof value === 'boolean' ? (
                <button
                  type="button"
                  onClick={() => updateNodeValue(path, !value)}
                  className={`text-xs px-2.5 py-0.5 rounded font-mono font-medium border transition-colors ${
                    value
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                  }`}
                  title="点击切换布尔值"
                >
                  {value ? 'true' : 'false'}
                </button>
              ) : (
                <input
                  type="text"
                  defaultValue={value === null ? 'null' : String(value)}
                  key={`${pathStr}-${value}`}
                  onBlur={(e) => {
                    const parsedVal = parseRawValue(e.target.value);
                    if (parsedVal !== value) {
                      updateNodeValue(path, parsedVal);
                    }
                  }}
                  className="flex-1 min-w-[120px] text-xs font-mono text-slate-800 bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded px-2 py-1 focus:outline-none transition-colors"
                  placeholder="节点值..."
                />
              )}

              {/* 类型徽章 */}
              <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 flex-shrink-0">
                {value === null ? 'null' : typeof value}
              </span>
            </div>
          )}

          {/* 删除按钮 */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`确定要删除节点 "${keyOrIndex}" 吗？`)) {
                deleteNode(path);
              }
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-all flex-shrink-0 ml-auto"
            title="删除此节点"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* 递归子层级 */}
        {isContainer && isExpanded && (
          <div className="flex flex-col mt-0.5">
            {isArray
              ? value.map((item: any, idx: number) =>
                  renderTreeItem(item, idx, [...path, idx], depth + 1)
                )
              : Object.keys(value).map((k) =>
                  renderTreeItem(value[k], k, [...path, k], depth + 1)
                )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-white text-slate-800 flex flex-col">
      {/* 头部标题与 5 大操作区 */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <ListTree size={20} />
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                YAML 节点编辑器 — 支持正则节点搜索（可编辑/删除）
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              可视解析 YAML 配置节点树，逐节点编辑键名与键值、新增/删除节点，配合正则精确定位与一键导出。
            </p>
          </div>

          {/* 5 个主要操作按钮 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => parseYamlInput(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors"
            >
              <RefreshCw size={14} />
              <span>格式化并生成节点视图</span>
            </button>

            <button
              type="button"
              onClick={handleExpandAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors"
            >
              <Maximize2 size={13} />
              <span>全部展开</span>
            </button>

            <button
              type="button"
              onClick={handleCollapseAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors"
            >
              <Minimize2 size={13} />
              <span>全部折叠</span>
            </button>

            <button
              type="button"
              onClick={handleExportYaml}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors"
            >
              <FileCode size={13} />
              <span>导出为 YAML</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadYaml}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors"
            >
              <Download size={13} />
              <span>下载 YAML</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主工作区 - 100% 宽度流式自适应 */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-5">
        {/* 顶部搜索区面板 */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 min-w-fit">
                <Search size={15} className="text-indigo-600" />
                <span>节点正则搜索</span>
              </div>

              {/* 待搜索 key 输入框 */}
              <div className="flex-1 min-w-[140px] max-w-xs">
                <input
                  type="text"
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  placeholder="要搜索的 key（默认 name）"
                  className="w-full text-xs px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                />
              </div>

              {/* 正则表达式输入框 */}
              <div className="flex-2 min-w-[200px]">
                <input
                  type="text"
                  value={searchRegex}
                  onChange={(e) => setSearchRegex(e.target.value)}
                  placeholder="正则表达式（例如: 香港|荷兰|\u0001F1ED）"
                  className="w-full text-xs px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                />
              </div>

              {/* 忽略大小写复选框 */}
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={searchIgnoreCase}
                  onChange={(e) => setSearchIgnoreCase(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>忽略大小写</span>
              </label>

              {/* 搜索按钮 */}
              <button
                type="button"
                onClick={() => executeSearch()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors ml-auto"
              >
                <Search size={13} />
                <span>执行搜索</span>
              </button>
            </div>

            {/* 搜索说明文字 */}
            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 flex items-start gap-2">
              <Info size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>说明：</strong>搜索会返回匹配到的 key 的完整路径与匹配文本。你可以直接编辑该节点的值（支持原始类型解析），或删除该节点（仅删除该 key）或删除所在的数组元素（如果该 key 在数组元素内）。
              </span>
            </div>

            {/* 搜索结果展示列表 */}
            {hasSearched && (
              <div className="mt-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">
                    搜索命中结果{' '}
                    <span className="text-indigo-600 font-mono">({searchResults.length})</span>
                  </span>
                  {searchResults.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      点击“编辑”可一键在下方节点树定位高亮
                    </span>
                  )}
                </div>

                {searchResults.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    未找到匹配项
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* 路径胶囊标签 */}
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium whitespace-nowrap">
                            {item.pathStr}
                          </span>

                          {/* 可编辑的值文本 */}
                          <input
                            type="text"
                            defaultValue={String(item.value ?? '')}
                            onBlur={(e) => {
                              const parsed = parseRawValue(e.target.value);
                              updateNodeValue(item.path, parsed);
                            }}
                            className="flex-1 min-w-[140px] text-xs font-mono px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:border-indigo-500"
                            placeholder="节点值..."
                          />
                        </div>

                        {/* 三个操作按钮 */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => navigateToNodeInView(item.path)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-600 bg-white hover:bg-indigo-50 border border-indigo-200 rounded transition-colors"
                            title="在下方树中展开并高亮此节点"
                          >
                            <ExternalLink size={12} />
                            <span>编辑（打开到视图）</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`确定要仅删除 key "${item.key}" 吗？`)) {
                                deleteNode(item.path);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 rounded transition-colors"
                            title="仅删除该属性 key"
                          >
                            <Trash2 size={12} />
                            <span>删除该 key</span>
                          </button>

                          {item.parentIsArray && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `确定要删除该节点所在的整个数组元素 [${item.arrayIndex}] 吗？`
                                  )
                                ) {
                                  deleteEnclosingArrayItem(item.arrayPath, item.arrayIndex);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                              title="删除此项在父级数组中的整个对象元素"
                            >
                              <Trash2 size={12} />
                              <span>删除所在数组元素</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 双栏布局：左侧输入/导出，右侧可视化节点树 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* 左侧：原始 YAML 输入区 + 导出 YAML 预览区 */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* 原始 YAML 输入区 */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-800">原始 YAML 输入</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setYamlInput(DEFAULT_YAML);
                      showToast('已重置为默认示例配置', 'info');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <RotateCcw size={12} />
                    <span>预置示例</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setYamlInput('');
                      setParsedData(null);
                      setYamlOutput('');
                      setSearchResults([]);
                      showToast('已清空输入内容', 'info');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>清空</span>
                  </button>
                </div>
              </div>

              {parseError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <div className="font-mono text-[11px] leading-relaxed break-all">
                    {parseError}
                  </div>
                </div>
              )}

              <textarea
                value={yamlInput}
                onChange={(e) => setYamlInput(e.target.value)}
                placeholder="在这里粘贴或输入 YAML 文本..."
                className="w-full h-80 min-h-[300px] text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 leading-relaxed transition-colors resize-y"
                spellCheck={false}
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>字符数: {yamlInput.length} | 行数: {yamlInput ? yamlInput.split('\n').length : 0}</span>
                <span>支持标准 YAML 1.2 语法</span>
              </div>
            </div>

            {/* 导出 YAML 输出区 */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 size={16} className="text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-800">实时导出 YAML 结果</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyOutput}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                  >
                    <Copy size={12} />
                    <span>一键复制</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadYaml}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
                  >
                    <Download size={12} />
                    <span>下载文件</span>
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                value={yamlOutput}
                placeholder="点击顶部“导出为 YAML”或直接编辑右侧节点树，此处将实时展示最新 YAML..."
                className="w-full h-64 min-h-[220px] text-xs font-mono p-3 bg-slate-900 text-slate-100 border border-slate-800 rounded-lg focus:outline-none leading-relaxed resize-y select-text"
                spellCheck={false}
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>输出大小: {yamlOutput.length} 字符</span>
                <span>文件名: export.yaml</span>
              </div>
            </div>
          </div>

          {/* 右侧：可视化节点树视图 */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-h-[580px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-2">
                <ListTree size={17} className="text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-800">可视化节点树</h2>
                {parsedData && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                    根节点可用
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddModalPath([]);
                    setNewChildType('string');
                    setNewChildKey('');
                    setNewChildValue('');
                  }}
                  disabled={!parsedData}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded disabled:opacity-40 transition-colors"
                >
                  <Plus size={13} />
                  <span>添加根属性</span>
                </button>
              </div>
            </div>

            {/* 节点树渲染区 */}
            <div className="flex-1 overflow-x-auto py-2">
              {parsedData === null || parsedData === undefined ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <FolderOpen size={36} className="text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600">暂无解析出的节点数据</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    在左侧粘贴 YAML 内容后，点击顶部【格式化并生成节点视图】按钮以加载节点树。
                  </p>
                </div>
              ) : typeof parsedData === 'object' ? (
                <div className="flex flex-col gap-0.5">
                  {Array.isArray(parsedData)
                    ? parsedData.map((item, index) =>
                        renderTreeItem(item, index, [index], 0)
                      )
                    : Object.keys(parsedData).map((key) =>
                        renderTreeItem(parsedData[key], key, [key], 0)
                      )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg text-xs font-mono">
                  标量值: {String(parsedData)}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 新增子节点 Modal 弹窗 */}
      {addModalPath !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Plus size={16} className="text-indigo-600" />
                <span>
                  {addModalPath.length === 0 ? '添加根节点属性' : `添加子节点 (${addModalPath.join('.')})`}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setAddModalPath(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              {/* 如果目标不是数组，需要输入 Key */}
              {(() => {
                let target = parsedData;
                for (const p of addModalPath) {
                  target = target[p];
                }
                const isArrayTarget = Array.isArray(target);
                if (isArrayTarget) {
                  return (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-600">
                      目标为数组，新元素将自动以自增下标追加至末尾。
                    </div>
                  );
                }
                return (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Key 键名 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newChildKey}
                      onChange={(e) => setNewChildKey(e.target.value)}
                      placeholder="例如: server, port, timeout..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                );
              })()}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">数据类型</label>
                <select
                  value={newChildType}
                  onChange={(e) => setNewChildType(e.target.value as ValueType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="string">String (字符串)</option>
                  <option value="number">Number (数字)</option>
                  <option value="boolean">Boolean (布尔值)</option>
                  <option value="null">Null (空值)</option>
                  <option value="object">Object (子对象/字典)</option>
                  <option value="array">Array (子数组/列表)</option>
                </select>
              </div>

              {newChildType !== 'object' && newChildType !== 'array' && newChildType !== 'null' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">初始值</label>
                  {newChildType === 'boolean' ? (
                    <select
                      value={newChildValue}
                      onChange={(e) => setNewChildValue(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      type={newChildType === 'number' ? 'number' : 'text'}
                      value={newChildValue}
                      onChange={(e) => setNewChildValue(e.target.value)}
                      placeholder={newChildType === 'number' ? '例如: 443' : '输入字符串内容...'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddModalPath(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmAddChild}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部浮动 Toast 提示 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-xs font-medium border ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={15} className="text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle size={15} className="text-rose-400" />}
            {toast.type === 'info' && <Info size={15} className="text-indigo-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
