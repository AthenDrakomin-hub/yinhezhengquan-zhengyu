import React from 'react';
import {
  FaUsers,
  FaChartLine,
  FaBookOpen,
  FaRegClock,
  FaMapMarkerAlt,
  FaUserTie,
  FaRegGem,
  FaShieldAlt,
  FaQuoteRight,
  FaHandshake,
  FaRocket,
  FaSearch,
} from 'react-icons/fa';
import TrainingCampChat from './TrainingCampChat';
import WebsiteDisclaimerModal from './WebsiteDisclaimerModal';

// 从环境变量读取图片 URL
const TRAINING_BG_1 = import.meta.env.VITE_TRAINING_BG_1 || '/images/training-bg-1.png';
const TRAINING_LOGO = import.meta.env.VITE_TRAINING_LOGO || '/logo.png';
const TRAINING_BG_2 = import.meta.env.VITE_TRAINING_BG_2 || '/images/training-bg-2.png';
const JOIN_US_BG = import.meta.env.VITE_JOIN_US_BG || 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/public/tupian/jiaruwomen-1.png';

const GalaxyTrainingCamp: React.FC = () => {
  // 控制网站声明弹窗显示
  const [isDisclaimerOpen, setIsDisclaimerOpen] = React.useState(false);

  // 使用浅色主题
  React.useEffect(() => {
    document.body.classList.add('light-mode');
    document.documentElement.style.backgroundColor = '#F1F5F9';
    
    return () => {
      document.body.classList.remove('light-mode');
      document.documentElement.style.backgroundColor = '#0A1628';
    };
  }, []);

  // 联合机构名单
  const partnerInstitutions = [
    { name: '今日资本', focus: '消费/科技', rep: '徐新' },
    { name: '汉鼎投资', focus: '硬科技/新能源', rep: '王麒诚' },
    { name: '重阳投资', focus: '价值投资', rep: '裘国根' },
    { name: '盘京投资', focus: '港股/成长股', rep: '粘洪峰' },
    { name: '张家豪资本', focus: '全球科技', rep: '张家豪' },
    { name: '高瓴资本', focus: '全周期', rep: '张磊' },
    { name: '景林资产', focus: '二级市场', rep: '蒋锦志' },
    { name: '淡水泉', focus: '逆向投资', rep: '赵军' },
    { name: '源乐晟', focus: '周期成长', rep: '曾晓洁' },
    { name: '敦和资管', focus: '宏观对冲', rep: '叶庆均' },
  ];

  // 真实投资故事（基于搜索资料改编）
  const stories = [
    {
      id: 1,
      title: '2.56亿变50亿：徐新与智谱AI的18倍回报',
      person: '徐新',
      institution: '今日资本',
      quote: 'VC的回报主要来自前3到5个项目，关键在于"击中本垒打"。',
      story:
        '2023年11月，当大多数人对AI大模型的商业化前景持观望态度时，徐新执掌的今日资本以2.56亿元人民币参与智谱AI的B3轮融资。两年后的2026年春节，智谱AI股价暴涨，这笔投资账面浮盈接近50亿元，回报率高达18倍。',
      detail:
        '这并非偶然。早在2000年代，徐新就凭借对京东的150倍回报一战封神。她坚持深度研究、重仓看好的项目，并长期陪伴企业成长。智谱AI的投资，正是她在AI热潮初期精准预判、果断出手的又一经典案例。',
      source: '据公开市场报道，智谱AI（02513.HK）2026年2月股价表现',
      image: '徐新',
    },
    {
      id: 2,
      title: '8年坚守：裘国根与新和成的240%收益',
      person: '裘国根',
      institution: '重阳投资',
      quote: '如果你想取得超额收益，必须对基本面有深刻的理解，不熟不投。',
      story:
        '2017年12月，裘国根耗资6亿元参与新和成定增。此后8年间，新和成股价经历两次"腰斩"，市场情绪跌宕起伏，但他选择坚守，甚至在低位加仓。',
      detail:
        '2026年初，新和成股价创下历史新高，市值逼近千亿。这笔坚守8年的投资，最终斩获超10亿元盈利，回报率达240%。裘国根用行动证明：真正的财富积累，从来都是时间的朋友。作为绍兴人，他对家乡这家维生素龙头企业有着超越市场的理解，这正是他能在波动中岿然不动的底气。',
      source: '据新和成定期报告及公开市场数据',
      image: '裘国根',
    },
    {
      id: 3,
      title: '逆周期重仓：王麒诚与Fisker的数十亿斩获',
      person: '王麒诚',
      institution: '汉鼎投资',
      quote: '投资的本质，是认知的变现。',
      story:
        '2017年，新能源汽车赛道尚未迎来资本热潮，80后投资人王麒诚以自有资金天使轮重仓美国新能源车企Fisker，持有10%股权。三年后，Fisker通过SPAC登陆纽交所，市值一度突破80亿美元。',
      detail:
        '这笔投资让王麒诚斩获数亿美元收益。他的独特之处在于：全自有资金、不募资、不追热点。当行业在"募资难、退出难"中挣扎时，他凭借"产业深耕+自有资金+生态赋能"的模式，在逆周期中完成千亿投资布局。2025年，他的投资组合退出率达25%，超出行业均值3倍。',
      source: '据Fisker上市公告及公开报道',
      image: '王麒诚',
    },
    {
      id: 4,
      title: '22年170倍：张家豪与谷歌的4万亿美元见证',
      person: '张家豪',
      institution: '张家豪资本',
      quote: '少做事、做对事、做大事。',
      story:
        '2004年，谷歌以荷兰式拍卖模式IPO，深陷争议。张家豪逆势投入1500万美元，22年后，当谷歌母公司Alphabet市值突破4万亿美元时，这笔投资已斩获超25亿美元净利，回报超170倍。',
      detail:
        '此后，他坚持"五维思维模型"，从金融、产业、社会、政治、人性五个维度交叉验证，在特斯拉、苹果、宁德时代等核心赛道持续布局，成为中国资本参与全球科技竞争的标杆人物。',
      source: '据Alphabet市值数据及公开报道',
      image: '张家豪',
    },
  ];

  // 课程模块
  const modules = [
    {
      title: '模块一：投资认知框架',
      sessions: ['长期主义的底层逻辑', '如何识别"本垒打"项目', '五维思维模型实战应用'],
      leader: '张家豪/徐新',
    },
    {
      title: '模块二：赛道研判方法论',
      sessions: ['未来5-10年的核心痛点', '新能源、AI、硬科技的布局时点', '从产业趋势到投资决策'],
      leader: '王麒诚/粘洪峰',
    },
    {
      title: '模块三：投后管理与赋能',
      sessions: ['生态协同如何创造价值', '从"投资人"到"赋能者"', '被投企业的成长陪伴'],
      leader: '裘国根/蒋锦志',
    },
    {
      title: '模块四：退出策略与时机',
      sessions: ['IPO、并购、转让的抉择', '如何把握卖出时点', '周期波动中的应对之道'],
      leader: '张磊/赵军',
    },
  ];

  return (
    <div 
      className="min-h-screen text-gray-900 relative"
      style={{
        backgroundImage: `url('${TRAINING_BG_1}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* 内容容器 */}
      <div className="relative z-10">
      {/* 导航栏 */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-20 border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img
              src={TRAINING_LOGO}
              alt="中国银河证券"
              className="h-8 w-auto"
            />
          </div>
          <div className="flex gap-6 text-sm text-[#4B5563]">
            <a href="/" className="hover:text-[#2563EB] transition">首页</a>
            <span className="text-[#2563EB] font-medium">银河·特训营</span>
          </div>
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="relative bg-gradient-to-r from-[#0F2B5C] to-[#1E3A8A] text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <FaRegGem className="text-[#FFD700]" />
              <span className="text-sm font-medium">十大私募机构 · 联合打造</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 max-w-4xl">
              银河·特训营
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl">
              与顶尖投资人同行，聆听真实的投资故事<br />
              从认知到实战，重塑你的投资基因
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <a
                href="#apply"
                className="bg-[#FFD700] hover:bg-[#E5C100] text-[#0F2B5C] font-semibold px-8 py-4 rounded-lg text-lg transition shadow-lg hover:shadow-xl"
              >
                立即申请 →
              </a>
              <a
                href="#courses"
                className="border-2 border-white hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-lg text-lg transition"
              >
                查看课程大纲
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 mt-16 text-center">
              <div>
                <div className="text-3xl font-bold">10+</div>
                <div className="text-sm text-blue-200">顶级私募</div>
              </div>
              <div>
                <div className="text-3xl font-bold">20+</div>
                <div className="text-sm text-blue-200">实战导师</div>
              </div>
              <div>
                <div className="text-3xl font-bold">8周</div>
                <div className="text-sm text-blue-200">深度特训</div>
              </div>
              <div>
                <div className="text-3xl font-bold">100+</div>
                <div className="text-sm text-blue-200">真实案例</div>
              </div>
              <div>
                <div className="text-3xl font-bold">∞</div>
                <div className="text-sm text-blue-200">生态资源</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 联合机构 */}
      <section className="py-20 bg-white relative">
        {/* 透明背景图 */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ 
            backgroundImage: `url('${TRAINING_BG_2}')` 
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl font-bold text-center text-[#1F2937] mb-4">十大联合发起机构</h2>
          <p className="text-center text-[#6B7280] mb-12 max-w-2xl mx-auto">
            汇聚中国顶尖私募力量，覆盖消费、科技、价值投资、宏观对冲全赛道
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {partnerInstitutions.map((inst, idx) => (
              <div
                key={idx}
                className="bg-white/80 backdrop-blur-sm border border-[#E5E7EB] rounded-lg p-4 text-center hover:shadow-md transition"
              >
                <div className="font-semibold text-[#1F2937]">{inst.name}</div>
                <div className="text-xs text-[#2563EB] mt-1">{inst.focus}</div>
                <div className="text-xs text-[#6B7280] mt-1">{inst.rep}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 投资故事板块 */}
      <section className="py-20 bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1F2937] mb-4">真实投资故事</h2>
            <p className="text-lg text-[#6B7280] max-w-3xl mx-auto">
              这不是纸上谈兵。每一位导师都将亲临分享他们职业生涯中最关键的战役——<br />
              那些决定成败的瞬间、穿越周期的坚守、以及不为人知的决策细节。
            </p>
          </div>

          <div className="space-y-12">
            {stories.map((story, idx) => (
              <div
                key={story.id}
                className={`bg-white rounded-2xl shadow-md overflow-hidden border border-[#E5E7EB] flex flex-col lg:flex-row ${
                  idx % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* 左侧/右侧：故事内容 */}
                <div className="flex-1 p-8 lg:p-10">
                  <div className="flex items-center gap-2 text-sm text-[#2563EB] font-medium mb-3">
                    <FaShieldAlt />
                    <span>{story.institution} · {story.person}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1F2937] mb-4">{story.title}</h3>
                  <div className="relative mb-6">
                    <FaQuoteRight className="absolute -top-2 -left-2 text-[#E5E7EB] text-4xl opacity-50" />
                    <p className="relative text-lg text-[#4B5563] italic pl-6">"{story.quote}"</p>
                  </div>
                  <p className="text-[#1F2937] mb-4 leading-relaxed">{story.story}</p>
                  <p className="text-[#6B7280] mb-4 leading-relaxed">{story.detail}</p>
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E5E7EB]">
                    <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                      <FaSearch />
                      <span>可核查来源：{story.source}</span>
                    </div>
                    <a href="#" className="text-sm text-[#2563EB] hover:underline flex items-center gap-1">
                      阅读完整案例 <span>→</span>
                    </a>
                  </div>
                </div>

                {/* 右侧/左侧：视觉元素 */}
                <div className="lg:w-80 bg-gradient-to-br from-[#0F2B5C] to-[#1E3A8A] p-8 flex flex-col items-center justify-center text-white">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-4 border-4 border-white/20">
                    <FaUserTie className="text-4xl text-[#FFD700]" />
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold mb-1">{story.person}</div>
                    <div className="text-sm text-blue-200 mb-3">{story.institution}</div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-3 py-1 bg-white/10 rounded-full text-xs">
                        {story.id === 1 ? '18倍回报' : story.id === 2 ? '8年坚守' : story.id === 3 ? '逆周期' : '170倍'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 课程模块 */}
      <section id="courses" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1F2937] mb-4">特训课程模块</h2>
          <p className="text-center text-[#6B7280] mb-12 max-w-2xl mx-auto">
            4大模块 · 8周深度特训 · 20+真实案例复盘
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {modules.map((module, idx) => (
              <div key={idx} className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-6 hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center text-white font-bold">
                    {idx + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-[#1F2937]">{module.title}</h3>
                </div>
                <ul className="space-y-2 mb-4">
                  {module.sessions.map((session, sidx) => (
                    <li key={sidx} className="flex items-start gap-2 text-[#4B5563]">
                      <span className="text-[#2563EB] mt-1">•</span>
                      <span>{session}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-sm text-[#6B7280] border-t border-[#E5E7EB] pt-3 mt-2">
                  领衔导师：{module.leader}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 申请信息 */}
      <section 
        id="apply" 
        className="py-20 relative"
        style={{
          backgroundImage: `url('${JOIN_US_BG}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* 背景遮罩 */}
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-[#E5E7EB]">
            <div className="grid md:grid-cols-2">
              <div className="p-8 md:p-12">
                <h2 className="text-3xl font-bold text-[#1F2937] mb-4">加入银河·特训营</h2>
                <p className="text-lg text-[#6B7280] mb-6">
                  我们寻找这样的你：
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] font-bold">✓</span>
                    <span className="text-[#4B5563]">希望在投资领域建立长期认知框架的从业者</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] font-bold">✓</span>
                    <span className="text-[#4B5563]">有3年以上投资经验，渴望突破瓶颈</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] font-bold">✓</span>
                    <span className="text-[#4B5563]">对价值投资、长期主义有信仰</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] font-bold">✓</span>
                    <span className="text-[#4B5563]">愿意投入时间，与顶尖投资人深度交流</span>
                  </li>
                </ul>
                <div className="space-y-4 text-sm text-[#6B7280] mb-8">
                  <div className="flex items-center gap-2">
                    <FaRegClock className="text-[#2563EB]" />
                    <span>开营时间：2026年5月（春季班）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt className="text-[#2563EB]" />
                    <span>地点：北京 · 中国银河证券总部</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaUsers className="text-[#2563EB]" />
                    <span>招生人数：限额40人（择优录取）</span>
                  </div>
                </div>
                
                {/* 联系特训营助理 */}
                <div className="pt-6 border-t border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280] mb-3">有疑问？联系我们的特训营助理</p>
                  <TrainingCampChat subject="银河特训营助理" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#0F2B5C] to-[#1E3A8A] p-8 md:p-12 text-white">
                <h3 className="text-2xl font-bold mb-4">申请流程</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>在线提交申请（3月31日截止）</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>简历筛选与电话沟通</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>导师面试（线上）</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>录取通知（4月中旬）</div>
                  </div>
                </div>
                <a
                  href="#"
                  className="block w-full bg-[#FFD700] hover:bg-[#E5C100] text-[#0F2B5C] text-center font-semibold py-4 rounded-lg text-lg transition shadow-lg"
                >
                  立即申请
                </a>
                <p className="text-xs text-blue-200 text-center mt-4">
                  申请截止：2026年3月31日 24:00
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 真实性声明 */}
      <section className="py-8 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-2 text-xs text-[#9CA3AF]">
            <FaShieldAlt className="flex-shrink-0 mt-0.5" />
            <p>
              本页面所载投资案例均基于公开市场信息及媒体报道，包括但不限于：智谱AI（02513.HK）招股书及股价表现、新和成（002001.SZ）定期报告、Fisker上市公告、Alphabet市值数据等。特训营旨在分享投资经验与方法论，不构成任何投资建议。过往业绩不代表未来表现。
            </p>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="border-t border-[#E5E7EB] py-6 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#9CA4B0]">
              Copyright © 2026 中国银河证券·证裕交易单元 版权所有 | 许可证号：Z123456
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a 
                href="https://www.chinastock.com.cn/newsite/online/branchNetwork.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6B7280] hover:text-[#2563EB] transition"
              >
                站点地图
              </a>
              <button 
                onClick={() => setIsDisclaimerOpen(true)}
                className="text-[#6B7280] hover:text-[#2563EB] transition"
              >
                网站声明
              </button>
            </div>
          </div>
        </div>
      </footer>
      
      {/* 网站声明弹窗 */}
      <WebsiteDisclaimerModal 
        isOpen={isDisclaimerOpen} 
        onClose={() => setIsDisclaimerOpen(false)} 
      />
      </div>
    </div>
  );
};

export default GalaxyTrainingCamp;
