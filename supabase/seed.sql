-- 预置一些新闻研报数据
INSERT INTO public.news_reports (title, category, summary, sentiment, author, related_symbols)
VALUES 
('银河证券：证裕单元 Nexus 系统正式进入公测阶段', '公告', '中国银河证券宣布其数字化转型核心项目“证裕单元”已完成底层重构。', 'positive', '证裕技术部', ARRAY['GALAXY']),
('2026 策略展望：红利资产仍是防御核心', '策略', '在全球波动加剧背景下，高股息红利标的具备更强的安全边际。', 'neutral', '银河投研总部', ARRAY['600000', '00700']),
('腾讯控股：云业务超预期增长，目标价上调', '个股', '受益于企业级 AI 需求爆发，腾讯云业务在 Q1 实现了两位数增长。', 'positive', '银河互联网组', ARRAY['00700']);

-- 注意：用户数据通常通过 Auth 注册产生，此处不直接在 Seed 中插入 profiles 以免冲突