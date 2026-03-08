import React, { useState, useEffect, useCallback } from 'react';
import { FaUniversalAccess, FaTimes, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

interface AxeIssue {
  id: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor' | 'none';
  help: string;
  helpUrl: string;
  target: string;
}

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// 加载 axe-core 脚本
const loadAxeScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).axe) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('加载无障碍检测库失败'));
    document.head.appendChild(script);
  });
};

const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [issues, setIssues] = useState<AxeIssue[]>([]);
  const [scanComplete, setScanComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'warning' | 'pass'>('all');
  const [contrastMode, setContrastMode] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);

  // 加载 axe 脚本
  useEffect(() => {
    if (isOpen && !isScriptLoaded) {
      loadAxeScript()
        .then(() => setIsScriptLoaded(true))
        .catch(err => console.error('加载 axe 失败:', err));
    }
  }, [isOpen, isScriptLoaded]);

  // 运行无障碍检测
  const runAudit = useCallback(async () => {
    if (!isScriptLoaded || !(window as any).axe) {
      alert('无障碍检测库正在加载中，请稍后再试');
      return;
    }

    setIsLoading(true);
    setScanComplete(false);

    try {
      const axe = (window as any).axe;
      const results = await axe.run(document.body, {
        reporter: 'v2',
        resultTypes: ['violations', 'incomplete', 'inapplicable', 'passes'],
      });

      const formattedIssues: AxeIssue[] = [];

      // 处理违规项
      results.violations.forEach((violation: any, index: number) => {
        violation.nodes.forEach((node: any) => {
          formattedIssues.push({
            id: `v-${index}-${node.target[0]}`,
            description: violation.description,
            impact: violation.impact,
            help: violation.help,
            helpUrl: violation.helpUrl,
            target: node.target[0] || '未知元素',
          });
        });
      });

      setIssues(formattedIssues);
      setScanComplete(true);
    } catch (err) {
      console.error('无障碍检测失败:', err);
      alert('检测失败，请刷新页面重试');
    } finally {
      setIsLoading(false);
    }
  }, [isScriptLoaded]);

  // 切换高对比度模式
  const toggleContrastMode = () => {
    const newMode = !contrastMode;
    setContrastMode(newMode);
    if (newMode) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
  };

  // 切换大字体模式
  const toggleLargeText = () => {
    const newMode = !largeText;
    setLargeText(newMode);
    if (newMode) {
      document.documentElement.style.fontSize = '120%';
    } else {
      document.documentElement.style.fontSize = '';
    }
  };

  // 切换链接高亮
  const toggleHighlightLinks = () => {
    const newMode = !highlightLinks;
    setHighlightLinks(newMode);
    if (newMode) {
      document.body.classList.add('highlight-links-mode');
    } else {
      document.body.classList.remove('highlight-links-mode');
    }
  };

  // 过滤问题
  const filteredIssues = issues.filter(issue => {
    if (activeTab === 'all') return true;
    if (activeTab === 'critical') return issue.impact === 'critical' || issue.impact === 'serious';
    if (activeTab === 'warning') return issue.impact === 'moderate' || issue.impact === 'minor';
    if (activeTab === 'pass') return false;
    return true;
  });

  const criticalCount = issues.filter(i => i.impact === 'critical' || i.impact === 'serious').length;
  const warningCount = issues.filter(i => i.impact === 'moderate' || i.impact === 'minor').length;

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      
      {/* 面板 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaUniversalAccess className="text-2xl text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">无障碍辅助</h2>
              <p className="text-xs text-blue-100">Accessibility Tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* 辅助功能开关 */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700 mb-3">视觉辅助</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors">
              <input
                type="checkbox"
                checked={contrastMode}
                onChange={toggleContrastMode}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">高对比度模式</div>
                <div className="text-xs text-gray-500">增强文字与背景对比</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors">
              <input
                type="checkbox"
                checked={largeText}
                onChange={toggleLargeText}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">大字体模式</div>
                <div className="text-xs text-gray-500">放大页面文字内容</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors">
              <input
                type="checkbox"
                checked={highlightLinks}
                onChange={toggleHighlightLinks}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">高亮链接</div>
                <div className="text-xs text-gray-500">突出显示所有可点击链接</div>
              </div>
            </label>
          </div>
        </div>

        {/* 检测按钮 */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={runAudit}
            disabled={isLoading || !isScriptLoaded}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                检测中...
              </>
            ) : (
              <>
                <FaCheckCircle />
                {scanComplete ? '重新检测' : '运行无障碍检测'}
              </>
            )}
          </button>
          {!isScriptLoaded && (
            <p className="text-xs text-gray-500 text-center mt-2">正在加载检测库...</p>
          )}
        </div>

        {/* 检测结果 */}
        {scanComplete && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 统计标签 */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                全部 ({issues.length})
              </button>
              <button
                onClick={() => setActiveTab('critical')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'critical' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                严重 ({criticalCount})
              </button>
              <button
                onClick={() => setActiveTab('warning')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'warning' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                警告 ({warningCount})
              </button>
            </div>

            {/* 问题列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredIssues.length === 0 ? (
                <div className="text-center py-8">
                  <FaCheckCircle className="text-4xl text-green-500 mx-auto mb-2" />
                  <p className="text-gray-600">未发现{activeTab === 'all' ? '' : '此类'}问题</p>
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-xl border ${
                      issue.impact === 'critical' || issue.impact === 'serious'
                        ? 'bg-red-50 border-red-200'
                        : issue.impact === 'moderate'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {issue.impact === 'critical' || issue.impact === 'serious' ? (
                        <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <FaInfoCircle className="text-amber-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-800">{issue.help}</h4>
                        <p className="text-xs text-gray-600 mt-1">{issue.description}</p>
                        <p className="text-xs text-gray-400 mt-1 truncate">元素: {issue.target}</p>
                        <a
                          href={issue.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                        >
                          了解更多 →
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 底部信息 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
          使用 axe-core 开源无障碍检测引擎
        </div>
      </div>

      {/* 全局样式 */}
      <style>{`
        .high-contrast-mode {
          filter: contrast(1.5);
        }
        .high-contrast-mode img {
          filter: contrast(1.2);
        }
        .highlight-links-mode a {
          outline: 2px solid #2563eb !important;
          outline-offset: 2px !important;
          background-color: rgba(37, 99, 235, 0.1) !important;
        }
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default AccessibilityPanel;
