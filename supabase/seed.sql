-- 预置研报数据
INSERT INTO public.reports (title, category, summary, sentiment, author)
VALUES 
('银河证券：证裕单元 Nexus 系统正式进入公测阶段', '公告', '中国银河证券宣布其数字化转型核心项目"证裕单元"已完成底层重构。', '看多', '证裕技术部'),
('2026 策略展望：红利资产仍是防御核心', '策略', '在全球波动加剧背景下，高股息红利标的具备更强的安全边际。', '中性', '银河投研总部'),
('腾讯控股：云业务超预期增长，目标价上调', '个股', '受益于企业级 AI 需求爆发，腾讯云业务实现了两位数增长。', '看多', '银河互联网组')
ON CONFLICT DO NOTHING;

-- 预置横幅公告
INSERT INTO public.banners (title, description, position, is_active)
VALUES 
('证裕交易单元 Nexus 正式上线', '全新数字化证券交易平台，为您提供专业的虚拟交易体验', 1, true),
('新股申购功能开放', '支持沪深两市 IPO 新股申购，一键打新更便捷', 2, true)
ON CONFLICT DO NOTHING;

-- 注意：用户数据通过 Auth 注册产生，此处不直接插入 profiles
