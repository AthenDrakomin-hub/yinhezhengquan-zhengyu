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
        '2004年谷歌上市前夕，张家豪通过友人渠道获得少量原始股。此后22年，他经历了2008年金融危机、2020年疫情崩盘、2022年科技股暴跌，但始终未卖出谷歌股票。',
      detail:
        '2026年初，谷歌市值突破4万亿美元，成为全球第一家达到此里程碑的科技公司。张家豪当年的投资已增值170倍。他说："大多数人高估了1年的变化，低估了10年的变化。时间是价值投资者唯一的朋友。"',
      source: '据Alphabet市值数据及公开报道',
      image: '张家豪',
    },
  ];

  // 特训营日程
  const schedule = [
    {
      day: '第一天',
      date: '5月16日',
      sessions: ['开营仪式', '徐新：VC如何击中本垒打', '张家豪：全球资产配置逻辑'],
      leader: '徐新',
    },
    {
      day: '第二天',
      date: '5月17日',
      sessions: ['裘国根：价值投资的坚守与进化', '王麒诚：逆周期投资的底层逻辑', '案例研讨'],
      leader: '裘国根',
    },
    {
      day: '第三天',
      date: '5月18日',
      sessions: ['分组路演', '导师点评', '结营仪式'],
      leader: '全体导师',
    },
  ];

  // 课程模块
  const modules = [
    {
      title: 'VC投资实战',
      sessions: ['早期项目筛选标准', '尽调方法论', '估值谈判技巧'],
      leader: '徐新',
    },
    {
      title: '价值投资体系',
      sessions: ['深度研究框架', '逆向投资时机', '长期持有心态'],
      leader: '裘国根',
    },
    {
      title: '逆周期布局',
      sessions: ['宏观周期判断', '行业轮动逻辑', '风险控制体系'],
      leader: '王麒诚',
    },
    {
      title: '全球配置',
      sessions: ['跨市场比较', '汇率风险管理', '地缘政治影响'],
      leader: '张家豪',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* 头部 */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={TRAINING_LOGO} alt="银河证券" className="h-10 w-auto" />
              <span className="text-xl font-bold text-[#1F2937]">银河特训营</span>
            </div>
            <nav className="flex items-center gap-6">
              <a href="#stories" className="text-[#4B5563] hover:text-[#2563EB] transition">
                投资故事
              </a>
              <a href="#schedule" className="text-[#4B5563] hover:text-[#2563EB] transition">
                课程安排
              </a>
              <a href="#apply" className="bg-[#FFD700] hover:bg-[#E5C100] text-[#1F2937] px-4 py-2 rounded-lg font-bold transition">
                立即申请
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero 区域 */}
      <section
        className="relative py-20"
        style={{
          backgroundImage: `url('${TRAINING_BG_1}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F2B5C]/90 to-[#1E3A8A]/80"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-[#FFD700] mb-6">
              银河特训营
            </h1>
            <p className="text-xl text-[#1F2937] mb-8">
              与顶尖投资人面对面，学习价值投资的底层逻辑与实战方法
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#apply"
                className="bg-[#FFD700] hover:bg-[#E5C100] text-[#0F2B5C] px-8 py-3 rounded-lg font-bold text-lg transition"
              >
                申请加入
              </a>
              <button
                onClick={() => setIsDisclaimerOpen(true)}
                className="bg-[#FFD700] hover:bg-[#E5C100] text-[#1F2937] border border-[#FFD700] px-8 py-3 rounded-lg font-bold transition"
              >
                了解更多
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 联合发起机构 */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <img 
              src="https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/public/tupian/jigou.png" 
              alt="联合发起机构" 
              className="w-full h-auto rounded-xl shadow-lg"
              onError={(e) => {
                console.error('机构图片加载失败');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      </section>

      {/* 投资故事 */}
      <section id="stories" className="py-20 bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1F2937] text-center mb-4">
            真实投资故事
          </h2>
          <p className="text-[#6B7280] text-center mb-12 max-w-2xl mx-auto">
            这些案例均基于公开市场信息，展示顶尖投资人的思考方式与决策逻辑
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {stories.map((story) => (
              <div
                key={story.id}
                className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden hover:shadow-md transition"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-[#FFD700] rounded-full flex items-center justify-center text-[#1F2937] font-bold text-lg">
                      {story.person[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1F2937]">{story.person}</h3>
                      <p className="text-sm text-[#6B7280]">{story.institution}</p>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-[#1F2937] mb-3">{story.title}</h4>
                  <p className="text-[#4B5563] mb-4">{story.story}</p>
                  <div className="bg-[#F9FAFB] rounded-lg p-4 mb-4">
                    <p className="text-sm text-[#4B5563] italic">"{story.quote}"</p>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">{story.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 课程安排 */}
      <section id="schedule" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1F2937] text-center mb-12">
            课程安排
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {schedule.map((day, index) => (
              <div
                key={index}
                className="bg-[#F9FAFB] rounded-xl p-6 border border-[#E5E7EB]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-[#FFD700] text-[#1F2937] px-3 py-1 rounded-full text-sm font-bold">
                    {day.day}
                  </span>
                  <span className="text-[#6B7280]">{day.date}</span>
                </div>
                <ul className="space-y-3">
                  {day.sessions.map((session, sidx) => (
                    <li key={sidx} className="flex items-start gap-2 text-[#4B5563]">
                      <span className="text-[#2563EB] mt-1">•</span>
                      <span>{session}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-sm text-[#6B7280] border-t border-[#E5E7EB] pt-3 mt-4">
                  领衔导师：{day.leader}
                </div>
              </div>
            ))}
          </div>

          {/* 课程模块 */}
          <h3 className="text-2xl font-bold text-[#1F2937] text-center mb-8">
            核心课程模块
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module, index) => (
              <div
                key={index}
                className="bg-[#F9FAFB] rounded-xl p-6 border border-[#E5E7EB] hover:shadow-md transition"
              >
                <h4 className="font-bold text-[#1F2937] mb-3">{module.title}</h4>
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
              <div className="bg-[#F9FAFB] p-8 md:p-12 border-l border-[#E5E7EB]">
                <h3 className="text-2xl font-bold mb-4 text-[#1F2937]">申请流程</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center text-sm font-bold text-[#1F2937]">1</div>
                    <div className="text-[#1F2937] font-medium">在线提交申请（3月31日截止）</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center text-sm font-bold text-[#1F2937]">2</div>
                    <div className="text-[#1F2937] font-medium">简历筛选与电话沟通</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center text-sm font-bold text-[#1F2937]">3</div>
                    <div className="text-[#1F2937] font-medium">导师面试（线上）</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#FFD700] rounded-full flex items-center justify-center text-sm font-bold text-[#1F2937]">4</div>
                    <div className="text-[#1F2937] font-medium">录取通知（4月中旬）</div>
                  </div>
                </div>
                <a
                  href="#"
                  className="block w-full bg-[#FFD700] hover:bg-[#E5C100] text-[#1F2937] text-center font-bold py-4 rounded-lg text-lg transition shadow-lg"
                >
                  立即申请
                </a>
                <p className="text-xs text-[#6B7280] text-center mt-4">
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

      {/* 网站声明弹窗 */}
      <WebsiteDisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
      />
    </div>
  );
};

export default GalaxyTrainingCamp;
