/**
 * 图片诊断页面
 * 用于检查和测试 Supabase 存储桶中的图片是否可以正常加载
 */

import React, { useState } from 'react';
import { LazyImage } from '../shared/LazyImage';

const ImageDiagnosticPage: React.FC = () => {
  const [loadingResults, setLoadingResults] = useState<{ [key: string]: 'loading' | 'success' | 'error' }>({});

  // 首页轮播图
  const carouselImages = [
    {
      id: 'carousel-1',
      url: 'https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/75581daa-fd55-45c5-8376-f51bf6852fde.jpg',
      title: '轮播图 1 - 证裕交易单元 Nexus',
    },
    {
      id: 'carousel-2',
      url: 'https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/123.png',
      title: '轮播图 2 - 数字化资产管理',
    },
    {
      id: 'carousel-3',
      url: 'https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/456.png',
      title: '轮播图 3 - 全球市场直连',
    },
  ];

  // 综合金融服务图片
  const serviceImages = [
    {
      id: 'service-1',
      url: 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_wealth_management@2x.96211330.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfd2VhbHRoX21hbmFnZW1lbnRAMnguOTYyMTEzMzAucG5nIiwiaWF0IjoxNzcyMzg5MzU1LCJleHAiOjE4MDM5MjUzNTV9.7V8gVGq24tWFBSLDUfDXMUB1rX8jJOiUtzHvPP5rETQ',
      title: '财富管理',
    },
    {
      id: 'service-2',
      url: 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_investment_financing@2x.541f016f.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfaW52ZXN0bWVudF9maW5hbmNpbmdAMnguNTQxZjAxNmYucG5nIiwiaWF0IjoxNzcyMzg5MzEwLCJleHAiOjE4MDM5MjUzMTB9.gNSFeBBk35kDEPVwV2wJmchpMNlXqUN1Vto5JqCQfD8',
      title: '投融资业务',
    },
    {
      id: 'service-3',
      url: 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_research_service@2x.213da3c3.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfcmVzZWFyY2hfc2VydmljZUAyeC4yMTNkYTNjMy5wbmciLCJpYXQiOjE3NzIzODkzMzcsImV4cCI6MTgwMzkyNTMzN30.nc7RAyo25jplNNl9R2Xuhv7DTg1RcCDSwW8bls5GEYk',
      title: '研究业务',
    },
    {
      id: 'service-4',
      url: 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_international_business@2x.d9987cf6.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfaW50ZXJuYXRpb25hbF9idXNpbmVzc0AyeC5kOTk4N2NmNi5wbmciLCJpYXQiOjE3NzIzODkyNzgsImV4cCI6MTgwMzkyNTI3OH0.EUasMximyC8PwoBmvG5IXPsX69crOsiC2AJNha-cCxs',
      title: '国际业务',
    },
  ];

  const testImage = async (url: string, id: string) => {
    setLoadingResults(prev => ({ ...prev, [id]: 'loading' }));
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        setLoadingResults(prev => ({ ...prev, [id]: 'success' }));
      } else {
        setLoadingResults(prev => ({ ...prev, [id]: 'error' }));
      }
    } catch (error) {
      console.error(`测试图片失败: ${url}`, error);
      setLoadingResults(prev => ({ ...prev, [id]: 'error' }));
    }
  };

  const testAllImages = () => {
    const allImages = [...carouselImages, ...serviceImages];
    allImages.forEach(img => testImage(img.url, img.id));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">图片加载诊断页面</h1>
          <p className="text-gray-600">用于检查 Supabase 存储桶中的图片是否可以正常加载</p>
          
          <button
            onClick={testAllImages}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            测试所有图片
          </button>
        </div>

        {/* 首页轮播图 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">首页轮播图</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {carouselImages.map(img => (
              <div key={img.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="aspect-video bg-gray-100">
                  <LazyImage
                    src={img.url}
                    alt={img.title}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{img.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 break-all">{img.url}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">状态:</span>
                    {loadingResults[img.id] === 'loading' && (
                      <span className="text-yellow-500">加载中...</span>
                    )}
                    {loadingResults[img.id] === 'success' && (
                      <span className="text-green-500">✓ 正常</span>
                    )}
                    {loadingResults[img.id] === 'error' && (
                      <span className="text-red-500">✗ 失败</span>
                    )}
                    {!loadingResults[img.id] && (
                      <span className="text-gray-400">未测试</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 综合金融服务 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">综合金融服务</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {serviceImages.map(img => (
              <div key={img.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="aspect-video bg-gray-100">
                  <LazyImage
                    src={img.url}
                    alt={img.title}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{img.title}</h3>
                  <p className="text-xs text-gray-600 mb-3 break-all">{img.url.substring(0, 60)}...</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">状态:</span>
                    {loadingResults[img.id] === 'loading' && (
                      <span className="text-yellow-500">加载中...</span>
                    )}
                    {loadingResults[img.id] === 'success' && (
                      <span className="text-green-500">✓ 正常</span>
                    )}
                    {loadingResults[img.id] === 'error' && (
                      <span className="text-red-500">✗ 失败</span>
                    )}
                    {!loadingResults[img.id] && (
                      <span className="text-gray-400">未测试</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 测试结果汇总 */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">测试结果汇总</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <span className="text-gray-700">总图片数:</span>
              <span className="font-semibold">{carouselImages.length + serviceImages.length}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">测试成功:</span>
              <span className="font-semibold text-green-500">
                {Object.values(loadingResults).filter(r => r === 'success').length}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">测试失败:</span>
              <span className="font-semibold text-red-500">
                {Object.values(loadingResults).filter(r => r === 'error').length}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ImageDiagnosticPage;
