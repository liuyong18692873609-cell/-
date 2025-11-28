

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chapter, Novel, ChatMessage, Character, PlotCard, AIModelType, Volume } from './types';
import NovelEditor, { NovelEditorHandle } from './components/NovelEditor';
import ChatPanel from './components/ChatPanel';
import Dashboard from './components/Dashboard';
import WorldPanel from './components/WorldPanel';
import ActivityBar, { ViewMode } from './components/ActivityBar';
import OutlineManager from './components/OutlineManager';
import StatisticsPanel from './components/StatisticsPanel';
import { generateChapterFromPlot, generateNextChapter, summarizeForOutline, generateChapterFromOutlines } from './services/geminiService';
import { Spinner } from './components/ui/Spinner';

const MOCK_VOLUMES: Volume[] = [
  {
    id: "v1",
    title: "第一卷：浊世初显",
    outline: "*   **主线：** 杀伥鬼 -> 险胜虎妖 -> 带着徒弟进入县城。\n*   **核心剧情：**\n    *   揭露县城“红尘洗练大阵”的真相（无痛剥削）。\n    *   方圆在县城开坛讲学，建立“正心书院”。\n    *   以“道理”对抗“修仙强权”。面对家族修士的挑衅，方圆付出代价，以字破法。\n*   **高潮：** 文斗家族老祖，揭开县城百年来“幸福早夭”的黑幕。"
  }
];

const MOCK_CHAPTERS: Chapter[] = [
  {
    id: "1",
    volumeId: "v1",
    title: "第一章：觉醒",
    content: "",
    chapterOutline: "1. **核心冲突**：主角方圆作为古籍修复师的极致秩序追求（强迫症）与世界本质“混乱熵增”的视觉呈现（浊气线条）之间的认知与生理冲突。\n\n2. **剧情节点 (Beat Sheet)**：\n   - **内视真相**：方圆在私塾尝试道家内视修炼，未见清灵之气，反而目睹世界真容是满屋乱窜、如劣质涂鸦般错乱翻涌的黑色线条（浊气）。\n   - **强行修正**：强烈的生理性强迫症令方圆无法容忍这种“概念错误”，他忍无可忍放弃传统引导，以指为笔对着虚空书写汉字“正”。\n   - **规则共鸣**：汉字引发规则共鸣，强行将屋内混乱的线条“拨乱反正”，拉直坍缩为秩序井然的纯净灵气，溢出的气息意外滋养窗外野花（女主起源）。\n\n3. **期待感管理**：通过展示“灵气即浊气”的反常规设定与主角“非修仙、乃修正”的汉字规则金手指，制造强烈的认知反差，吸引读者探索这双“能修正世界”的手将如何面对后续更庞大的崩坏世界。",
    history: [
      {
        id: "1764037457573",
        timestamp: 1764037457573,
        title: "第一章：觉醒",
        content: "",
        summary: "主角在雨夜中醒来，发现周围环境异常。"
      }
    ]
  },
  {
    id: "2",
    volumeId: "v1",
    title: "第二章：暗影",
    content: ""
  }
];

const MOCK_CHARACTERS: Character[] = [
  {
    id: "c1",
    name: "方圆",
    personality: "温柔但极度偏执，拥有严重的修复强迫症。外表儒雅随和，内心对“规则/秩序”有绝对的洁癖。拒绝“吃人”的修仙方式。",
    abilities: "逆熵修复、汉字规则（降维打击）、金缮镇压。能将浊气修正为灵气，但需付出肉体崩裂的代价。",
    background: "前世为国家级博物馆古籍修复专家。穿越后发现修仙界本质是“吃人”的熵增世界，誓要以凡人之躯修补天道。"
  },
  {
    id: "c2",
    name: "张阿蛮",
    personality: "憨厚、忠诚。前期懵懂，后期展现出帝王心术和铁血手腕。",
    abilities: "纯阳之体，物理外挂。前期靠方圆在背上写字（如“山”、“火”）获得战力，后期走武道人仙路线。",
    background: "农家少年，方圆的徒弟。被方圆从伥鬼手中救下，未来的人族守护者（人皇）。"
  },
  {
    id: "c3",
    name: "方思甜",
    personality: "前期可爱依赖，后期霸气冷艳（妖帝）。",
    abilities: "克苏鲁植物系古神血脉。能统御妖族。",
    background: "原为私塾小院的一株野花，因方圆第一次书写“正”字逸散的灵气而开启灵智。后统领妖族守护方圆。"
  },
  {
    id: "c4",
    name: "虎妖",
    personality: "残忍、狡诈、贪婪。",
    abilities: "强大的妖躯，控制伥鬼。",
    background: "盘踞本地的大妖，与修仙家族有商业合作关系，通过吃人修炼，是主角前期的主要敌人。"
  }
];

const MOCK_CHAT_HISTORY: ChatMessage[] = [
  {
    "id": "1764037921057",
    "role": "user",
    "text": "【项目代号：浊世师表】标准正文大纲全案 (Final Version)\n一、 作品基础信息 (Basic Information)\n书名： 《浊世师表》\n类型： 仙侠 / 东方玄幻 / 儒道流（融合克苏鲁诡异风格与悬疑探案元素）\n核心梗： 一位拥有“修复强迫症”的古籍修复师，以“凡人之躯”和“汉字规则”，强行修补这个“吃人”的破碎世界。\n基调：\n厚重感： 类似《将夜》或《雪中悍刀行》的叙事起势，讲究规矩与逻辑。\n压抑与诡异： 强调世界的扭曲（克苏鲁视角的浊气）与主角施法的惨烈代价。\n智斗与调查： 前期侧重观察、追踪、识破、险胜。\n二、 世界观底层逻辑 (Worldbuilding)\n1. 物理法则与视觉规范：【秩序与熵】\n本质真相： 天地间的所有能量本质相同。\n灵气： 有序的、稳定的低熵能量。\n浊气： 无序的、混乱的高熵能量（实为上界排出的废气）。\n视觉表现（中国化定制）：\n浊气（在方圆眼中）： 表现为**“错乱的笔触”、“如煮沸后的浑水般翻涌的气浪”或者“如同由于高温而产生的空间扭曲（热浪/海市蜃楼）”**。给人一种眩晕感，仿佛天地间的线条被揉乱了。\n主角能力（在方圆眼中）： 表现为金色的、笔直的线条，或者如同界尺般精准的几何切割。代表着绝对的“规矩”与“方圆”。\n唯一性铁律（资源获取）：\n主角（方圆）： 唯一拥有**“赋予浊气秩序，将其坍缩为灵气”**的能力（逆熵/修复）。\n其他众生（修仙者/妖族）： 只能靠**“过滤”或者“捡漏”**。他们只能吸收：\n尸气： 凡人或者修士死亡后，从尸体中自动逸散出的少量经过身体过滤的二手灵气。\n天材地宝： 天地间极少数自然生长并完成过滤的灵植或者灵矿。\n2. 生态链与分拣机制：【无痛剥削】\n凡人现状（电池）： 平均寿命30岁或者40岁。被修仙家族的阵法（“红尘洗练大阵”）全天候抽取生机。修仙者对凡人的剥削是无痛但致命的（抽取生机），而非血淋淋的直接屠杀，凡人往往在幸福的幻觉中含笑早夭，社会对于早夭习以为常。\n修仙家族（顶层）： 建立阵法作为统治工具与“抽血泵”。\n大妖（合伙人）： 实力仅比家族弱一线。家族认为消灭大妖代价太大，故默许其存在，并允许其吃掉部分凡人（流民/老弱）或者不听话的下属。\n分拣机制（三级）：\n一级品（特种耗材）： 极品灵根或者特殊体质（如张阿蛮）。\n同流合污者：赐家族主姓，重点培养。\n反抗者：做人丹药引、活体阵眼或者老祖夺舍容器。(这是虎妖想私吞的目标)\n二级品（工具/电池）： 普通灵根。\n同流合污者：赐外姓，做打手。\n反抗者：关入“人牲塔”，做成“二级过滤器”，耗尽生命力榨取灵气。\n三级品（肥料）： 落选者，留在镇里自然过滤灵气直至早夭。\n三、 角色档案 (Character Profiles)\n1. 主角：方圆\n前世职业： 古籍修复师（国家级博物馆专家）。\n背景： 钻研甲骨文、金文、简帛。亲手修复过战国楚简。\n技能核心： 懂得汉字的**“原始构造”与“受力结构”**。知道“道”字怎么写才符合天理。\n性格： 温柔 + 善良 + 温和 + 严重修复强迫症。\n行为逻辑： 他不苟，也不怕事。他看世界像看一本破损的古籍。因性格温和善良，看到“残缺（吃人）”时，职业本能与心中公义驱使他必须去修补它，讨一个公道。\n教学内容： 识字、做人。绝不涉及修仙。\n原因： 目前世界的修炼法（吸浊气/吸尸气）是错误的；方圆转灵气范围有限；方圆的“逆熵法”门槛极高（需常年积累汉字结构知识）；孩子暂时学不会，只能先教识字做人。\n2. 核心配角\n张阿蛮（徒弟）： 憨厚农家少年，纯阳之体。\n状态： 觉醒期。精力无穷，气息外泄。在方圆眼中是一轮行走的大日。因此引来虎妖。\n成长路线： 前期依靠方圆在背上书写汉字（如“山”、“火”）获得物理无敌；后期成为铁血帝王。\n方思甜（女主）： 私塾庭院中的一株花。\n背景： 被方圆尝试转化灵气时逸散的灵气喂养，开启灵智。\n命名由来： 前期叫“小花妖”。因化形后特别爱吃甜食（也许是因为这世道太苦），被方圆取名为“思甜”，并随师姓“方”。\n象征： “有教无类”。\n虎妖（第一卷反派）： 盘踞本地的大妖。与家族有商业合作关系。\n状态： 急需突破否则大限将至。\n动机： 面临老死，发现阿蛮纯阳大补。为续命甚至反超家族，铤而走险。\n作案手法： 截杀执事 -> 拘禁残魂在皮囊内 -> 魂灯未灭仅变暗 -> 炼制伥鬼 -> 伪装上门。\n四、 战斗与能力系统 (Combat System)\n1. 能力本质：【概念级·秩序重建】\n原理： 引用道家经典（如“道生一...三生万物”）或汉字本源，强制建立坐标系，让无序浊气按照“道”的规则有序排列。\n操作流程：【定心 + 落笔】\n定心（心法）： 儒（镇压/控制）、兵（毁灭/物理破坏）、道（转化/防御）。\n落笔（载体）： 以指代笔，凌空书写，金线凝结。不是画符，而是写汉字，引发规则共鸣（如写“重”改变重力，写“分”分离物质）。\n2. 限制与代价（重要设定）\n精神反噬： 头痛 -> 吐血 -> 神魂受创/碎裂。\n知见障/文字劫（肉体代价）： 强行越级使用（如凡人之躯对抗大妖） -> 指骨碎裂 -> 肉体急速衰老（头发变白，机能老化，面容不变）。\n活体豁免： 前期无法直接净化满血的活体强敌（需要配合谋略或物理杀伤）。\n五、 开篇黄金三章剧情流 (Story Flow)\n第一章：赝品 (The Fake)\n\n场景： 私塾。方圆修补古籍。小花妖（未来的方思甜）在旁摇曳，阿蛮因觉醒发热被嘲笑。\n事件： 伥鬼伪装的“执事”召集小孩摸骨，定下阿蛮。\n识破（侦探细节）：\n方圆行礼，发现执事回礼动作生硬、像提线木偶。\n闻到浓厚的香烛气味（掩盖尸臭）。\n看到执事眼神发散、不聚焦。\n行动： 方圆暗中调动浩然正气（微调汉字规则）试探，确认为伥鬼。为不打草惊蛇，选择暗中跟踪。\n第二章：修补与追踪 (Trace & Fix)\n\n追踪： 方圆一路跟随至深山虎妖洞府，目睹执事现原形，将阿蛮献给虎妖。\nBOSS战（苦战/险胜）：\n方圆现身救人。\n过程： 战斗艰难。方圆利用“兵家”杀伐手段（如写“戈”）攻击，利用“道家”手段防御。\n代价： 面对虎妖的强大妖气，方圆强行书写高阶汉字进行规则镇压，导致指骨崩裂，头发以肉眼可见的速度变白。\n结果： 拼尽全力，险胜并击杀虎妖。\n第三章：黑幕与公道 (Justice)\n\n惨状： 阿蛮在洞府中发现去年玩伴的遗骸。\n证物： 方圆搜出**“分灵盘”**及账本，发现虎妖与家族的商业勾结证据。\n转折： 方圆意识到家族才是握刀的手。虽然性格温和，但面对如此残缺的世道，他决定前往家族（县城）。\n目的： 不为杀戮，只为了给死去的人和这世道讨一个公道。\n六、 宏观分卷大纲 (Four Volumes Structure)\n第一卷：修身保命（练气~筑基篇）\n\n主线： 杀伥鬼 -> 险胜虎妖 -> 带着徒弟进入县城。\n核心剧情：\n揭露县城“红尘洗练大阵”的真相（无痛剥削）。\n方圆在县城开坛讲学，建立“正心书院”。\n以“道理”对抗“修仙强权”。面对家族修士的挑衅，方圆付出代价，以字破法。\n高潮： 文斗家族老祖，揭开县城百年来“幸福早夭”的黑幕。\n第二卷：齐家立命（金丹~元婴篇）\n\n主线： 建立书院/根据地。定下“禁仙”规矩。\n核心剧情：\n书院成为一股清流，势力博弈升级。\n阿蛮崛起： 方圆负责“文”（规则压制），阿蛮负责“武”（物理输出）。阿蛮领军对抗来自上级宗门的围剿。\n文以载道： 方圆镇压来犯之敌，每一次出手都伴随着对天道的深刻修正。\n第三卷：治国立心（化神~合体篇）\n\n主线： 阿蛮登基建立人道皇朝。方思甜（女主）回归妖族夺权。\n核心剧情：\n阿蛮称帝： 建立国号，推行新法（废除宗门，天下布武）。\n阿蛮的成长： 展现出帝王心术和铁血手腕，不再完全依赖方圆决策。\n方圆定位： 退居幕后做精神支柱，对抗逐渐苏醒的“天道意志”（旧秩序）。\n第四卷：万世太平（渡劫~飞升篇）\n\n主线： 举国飞升，伐天之战。\n核心剧情：\n真相揭露： 揭露上界真相（把下界当垃圾场，浊气来源）。\n封神： 张百忍（阿蛮或相关角色）封神，建立真正的天庭秩序。\n结局： 方圆播撒文明火种，以古籍修复师的身份，净化宇宙浊气，重写物理法则。\n七、 关键设定备忘录 (Do's & Don'ts)\n不要系统： 金手指源于主角的知识储备和异界规则共鸣，而非机械的系统提示音。\n不要物理化描写： 净化过程侧重唯心意境（神念、律动、同化、规则修改），而非画符、扔火球等传统物理手段。\n阿蛮的成长： 第三卷开始，阿蛮必须展现出帝王心术和铁血手腕，不再依赖主角决策。\n残忍的隐蔽性： 修仙者对凡人的剥削是无痛但致命的（抽取生机），而非血淋淋的直接屠杀，这更具讽刺意味。\n这一份纲领，如果按照标准大纲模板还缺乏了哪些因素，指出来",
    "fullPrompt": "【项目代号：浊世师表】标准正文大纲全案 (Final Version)..."
  },
  {
    "id": "1764037941162",
    "role": "model",
    "text": "这案子我看完了。底子非常好，**“克苏鲁+儒道流+修复师”**这个核心梗非常有张力... (建议：正反馈机制、反派仇恨链、金缮设定)...",
    "isThinking": false
  },
  {
    "id": "1764038608604",
    "role": "user",
    "text": "首先需要你根绝我的设定帮我加入正反馈机制，以及境界对标表... (设定补强：金缮/瓷化)...",
    "fullPrompt": "首先需要你根绝我的设定帮我加入正反馈机制..."
  },
  {
    "id": "1764038624523",
    "role": "model",
    "text": "收到。作为主编，我非常欣赏你这种**“去伪存真、坚持核心”**的创作态度... (增补：字灵收录、境界对标、仇恨链、金缮视觉包装)...",
    "isThinking": false
  },
  {
    "id": "1764038858341",
    "role": "user",
    "text": "很不错，那么将你补充的设定统合我前面的设定，按照我要求的详细描述的写法，将新的大纲发给我",
    "fullPrompt": "很不错，那么将你补充的设定统合我前面的设定，按照我要求的详细描述的写法，将新的大纲发给我"
  },
  {
    "id": "1764038878277",
    "role": "model",
    "text": "这是一份经过严格整合、打磨后的最终版《浊世师表》全案大纲...\n\n# 【项目代号：浊世师表】标准正文大纲全案 (Final Integrated Version)...",
    "isThinking": false
  },
  {
    "id": "1764039834817",
    "role": "user",
    "text": "有一项核心机制你没有写进去物理法则与视觉规范：【秩序与熵】 本质真相： 天地间的所有能量本质相同... (补充：以字镇压伤势，依然吃饭记住人的味道)...",
    "fullPrompt": "有一项核心机制你没有写进去物理法则与视觉规范..."
  },
  {
    "id": "1764039862031",
    "role": "model",
    "text": "收到。你非常敏锐，**“以字镇身”**这个改动比单纯的“能量填充”高明太多了... (修正后的大纲：Final Revised Version)...",
    "isThinking": false
  },
  {
    "id": "1764041077379",
    "role": "user",
    "text": "再次进行补充核心配角... (补充张阿蛮、方思甜成长线；补充清浊两界跷跷板效应；修改大结局为双圣永存)...",
    "fullPrompt": "再次进行补充核心配角..."
  },
  {
    "id": "1764041100922",
    "role": "model",
    "text": "这份经过深度修正的大纲，逻辑闭环堪称完美...\n\n# 【项目代号：浊世师表】标准正文大纲全案 (Final Perfect Version)...",
    "isThinking": false
  },
  {
    "id": "1764042243285",
    "role": "user",
    "text": "再次增加一个前期主角和修仙家族对立的原因... (补充：主角拒绝投诚的道德洁癖；补充第一次转化灵气的细节：误打误撞写“正”字)...",
    "fullPrompt": "再次增加一个前期主角和修仙家族对立的原因..."
  },
  {
    "id": "1764042246773",
    "role": "model",
    "text": "太棒了！你补充的这个**“第一次转化”**的细节，简直是神来之笔...\n\n# 【项目代号：浊世师表】标准正文大纲全案 (Final Perfect Version 2.0)...",
    "isThinking": false
  }
];

const MOCK_NOVEL: Novel = {
    id: "1",
    title: "浊世师表",
    author: "未名",
    genre: "玄幻/悬疑",
    description: "如果不把这颠倒的“天理”修好，这满纸吃人的历史，谁来撕？\n\n前世他是故宫古籍修复师，拥有极致的“修复强迫症”。\n今生他落入一个被“浊气”扭曲的诡异修仙界。\n别人修仙靠吸纳灵气，只有他，靠“汉字”重建规则。\n“在这个三十岁即算高寿的疯狂世道，我教给徒弟的第一课，不是长生，而是——杀人偿命，欠债还钱！”\n\n【正式详情版】\n\n简介\n\n【克苏鲁悬疑 + 硬核儒道 + 文明重建】\n\n“我看这天地，如同一本被虫蛀霉烂、错页颠倒的孤本残卷。”\n\n方圆，前世国家级博物馆古籍修复专家，带着一双能看透“物质结构”的眼睛和严重的强迫症，穿越到了一个光怪陆离的修仙世界。\n\n这里的真相，令人作呕：\n凡人视修仙者为守护神，却不知自己只是圈养的“人牲”。\n所谓“盛世”，不过是一座巨大的“红尘洗练大阵”，全天候抽取凡人生机。\n常人三十岁便含笑而终，被视为“喜丧”，实则是薪柴燃尽后的余灰。\n充斥天地的不是灵气，而是名为“浊气”的混乱污秽——在方圆眼中，那是无数错乱扭曲的线条，是如同沸水般翻涌的恶念，是不可名状的疯狂。\n\n这里的规则，已被篡改：\n妖魔与世家举杯共饮，分食血肉；\n修士视凡人为草芥肥料，理所当然。\n\n方圆本想做个安静的教书先生，教几个孩子识字做人。\n直到那一天，伥鬼伪装的执事敲开了私塾的门，要带走他那憨厚的徒弟张阿蛮，去做妖魔续命的药引。\n\n“既然这世道的规矩坏了，那我就用我的规矩，给它修修补补。”\n\n他没有系统，不修金丹。\n他站在那只吞噬血食的虎妖面前，凡人之躯，白衣如雪。\n他伸出手指，凌空虚划，指尖淌血，金线如刀。\n这一笔，写的是**“山”，重若千钧，镇压万法；\n这一划，写的是“火”**，文明之光，焚尽污秽！\n\n代价是，每写一字，发白一寸，寿减十年。\n\n“无规矩，不成方圆。我，便是方圆。”\n“我来这里只办三件事：修残籍，正人心，修补这吃人的天道！”",
    outline: "1. **核心脑洞/金手指**：主角方圆是一位患有“修复强迫症”的古籍修复师，穿越到被上界视作排污渠的下界。金手指并非系统，而是通过书写汉字（如“正”、“镇”），引发规则共鸣，强行将视界内混乱如熵增线条的“浊气”拨乱反正为有序的“灵气”。由于以凡人肉身承载天道规则，每次施法都会导致肉体崩裂，需以指为笔、以字为钉，用“金缮”工艺强行修补身体，导致躯体逐渐“瓷器化”。\n\n2. **卖点解析**：\n   - **独特美学体系**：将儒道流的“汉字规则”与“金缮修复”结合，创造出施法即破碎、破碎即重塑的残酷美学，视觉冲击力强。\n   - **极致的人设风骨**：主角具有绝对的道德洁癖，拒绝“吃人”修仙者的投诚，坚持“脏了就是脏了”的纯粹立场，营造出举世皆敌却虽千万人吾往矣的厚重感。\n   - **黑暗修仙本质**：揭露灵气实为尸气、修仙本质为熵减掠夺的黑暗设定，结合克苏鲁式的视觉描写（混乱线条），提升了玄幻世界的深度。\n   - **文明博弈**：故事核心从个人复仇上升到上下两界的资源守恒与熵值对抗，逻辑严密。\n\n3. **主线节奏图**：\n   - **开篇**：方圆在私塾尝试内视，因强迫症无法忍受世界本质的混乱线条，书写“正”字意外净化出灵气并点化花妖。随后为救徒弟阿蛮击杀虎妖，肉身崩裂并首次进行“金缮”修复。面对县城修仙家族赵家的拉拢，方圆因其法力源于吃人而断然拒绝，斩杀老祖，向浊世宣战。\n   - **前期剧情**：方圆净化范围从一室扩展至一城，血洗县城修仙势力，建立书院。因拒绝既得利益者“洗白”投诚，遭到周边宗门联合围剿。方圆以汉字真意对抗众敌，逐步收录字灵，身体瓷化程度加深；徒弟阿蛮参军历练，花妖方思甜觉醒远古血脉。\n   - **中期拓展**：净化范围覆盖至疆域，建立人道皇朝，确立“不吃人”的修仙新法。下界环境大幅改善导致“跷跷板效应”，上界灵气变浊。上界清微宗为维持自身清灵，视方圆为文明死敌，发动跨界战争，意图毁灭下界重启循环。\n   - **大结局**：伐天之战爆发，阿蛮成人皇、思甜成妖帝，共抗上界。方圆领悟杀戮无法解决能量守恒，选择身化万千，一分为二：白衣分身飞升上界吞噬废气，黑衣分身（金缮态）留守下界净化淤泥。两界隔绝，方圆消失，换来万世太平。\n\n4. **人物羁绊**：\n   - **方圆（师）与张阿蛮（徒/人皇）**：阿蛮拥有纯阳之体，前期作为方圆的“物理外挂”（在背上写字借法）和护卫；后期阿蛮成长为铁血人皇，统领人族大军守护恩师与理想。\n   - **方圆（师）与方思甜（徒/妖帝）**：思甜因方圆第一次书写“正”字溢出的灵气而诞生灵智；为报师恩及分担压力，主动前往妖域以铁血手段统一妖族，最终率亿万妖兽回归决战。\n   - **方圆与众生**：一种单向的、偏执的救赎关系。方圆不求众生理解，只因“看不惯”世界的错乱而强行修复，以自身破碎换取世界完整。",
    volumes: MOCK_VOLUMES,
    chapters: MOCK_CHAPTERS,
    characters: MOCK_CHARACTERS,
    plotCards: [],
    chatHistory: MOCK_CHAT_HISTORY,
    createdAt: new Date('2023-10-01'),
};

const App: React.FC = () => {
  // Initialize novels from localStorage or use MOCK_NOVEL
  const [novels, setNovels] = useState<Novel[]>(() => {
      try {
          const saved = localStorage.getItem('dream_writing_novels');
          if (saved) {
              const parsed = JSON.parse(saved);
              // Simple validation to ensure it's an array
              if (Array.isArray(parsed) && parsed.length > 0) {
                  return parsed;
              }
          }
      } catch (e) {
          console.error("Failed to load novels from localStorage", e);
      }
      return [MOCK_NOVEL];
  });

  const [currentNovelId, setCurrentNovelId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('write');

  // Modals State
  const [showGenNextModal, setShowGenNextModal] = useState(false);
  const [nextChapterOutline, setNextChapterOutline] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  
  // Edit Description Modal State
  const [showDescModal, setShowDescModal] = useState(false);
  const [editDescContent, setEditDescContent] = useState('');

  const [isGeneratingChapter, setIsGeneratingChapter] = useState(false);
  
  // Universal AI Confirmation Modal State
  const [aiConfirmation, setAiConfirmation] = useState<{
    message: string;
    onConfirm: (useChatHistory: boolean) => void;
  } | null>(null);
  const [useRecentChat, setUseRecentChat] = useState(true); // Default to true


  // AI Generation Model Selection
  const [aiModelForGeneration, setAiModelForGeneration] = useState<AIModelType>(AIModelType.SMART);

  // Exit Modal State
  const [showExitModal, setShowExitModal] = useState(false);
  const editorRef = useRef<NovelEditorHandle>(null);

  // Derived state for active novel
  const activeNovel = novels.find(n => n.id === currentNovelId) || null;
  
  // State for active chapter within the active novel
  const [activeChapterMap, setActiveChapterMap] = useState<Record<string, string>>({
      [MOCK_NOVEL.id]: MOCK_CHAPTERS[0].id
  });

  const activeChapterId = activeNovel ? (activeChapterMap[activeNovel.id] || activeNovel.chapters[0]?.id) : null;
  const activeChapter = activeNovel?.chapters.find(c => c.id === activeChapterId) || null;

  // Persist novels to localStorage whenever they change
  useEffect(() => {
      try {
          localStorage.setItem('dream_writing_novels', JSON.stringify(novels));
      } catch (e) {
          console.error("Failed to save novels to localStorage", e);
      }
  }, [novels]);

  // Prevent accidental close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = ''; 
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Generic internal navigation guard (for switching chapters)
  const withUnsavedCheck = (action: () => void) => {
    if (hasUnsavedChanges) {
        if (window.confirm('当前章节有未保存的修改，离开将导致修改丢失。是否确认离开？')) {
            setHasUnsavedChanges(false);
            action();
        }
    } else {
        action();
    }
  };

  const handleBackToDashboard = () => {
      setShowExitModal(true);
  };

  const handleConfirmExit = (shouldSave: boolean) => {
      if (shouldSave) {
          if (editorRef.current) {
              editorRef.current.save();
          }
      }
      setShowExitModal(false);
      setHasUnsavedChanges(false);
      setCurrentNovelId(null);
  };

  const handleCreateNovel = (newNovelData: Omit<Novel, 'id' | 'chapters' | 'createdAt'>) => {
      const newNovel: Novel = {
          ...newNovelData,
          id: Date.now().toString(),
          chapters: [{ id: '1', volumeId: 'v1', title: '第一章', content: '' }],
          volumes: [{id: 'v1', title: '第一卷', outline: ''}],
          chatHistory: [],
          characters: [],
          plotCards: [],
          createdAt: new Date(),
      };
      setNovels(prev => [newNovel, ...prev]);
      setCurrentNovelId(newNovel.id);
      setViewMode('write');
  };

  // --- REFINED DELETE HANDLERS START ---
  // Ensure deletions are immediate, UI updates instantly, and data persists correctly via useEffect.

  const handleDeleteNovel = useCallback((novelId: string) => {
      if (window.confirm("确定要删除这本小说吗？此操作无法撤销。")) {
          // Immediately update state to remove the novel
          setNovels(prev => prev.filter(n => n.id !== novelId));
          
          // If the deleted novel was the active one, reset the view
          if (currentNovelId === novelId) {
            setCurrentNovelId(null);
          }
      }
  }, [currentNovelId]);

  // Helper to update current novel using functional update (safe against closure staleness)
  const updateActiveNovel = useCallback((updater: (novel: Novel) => Novel) => {
      setNovels(prev => prev.map(n => {
          if (n.id === currentNovelId) {
              return updater(n);
          }
          return n;
      }));
  }, [currentNovelId]);

  const handleDeleteCharacter = useCallback((charId: string, skipConfirm = false) => {
      if (skipConfirm || window.confirm("确定要删除这个人物卡吗？")) {
          // Functional update ensures we operate on the latest state
          setNovels(prev => prev.map(n => {
              if (n.id === currentNovelId && n.characters) {
                  return {
                      ...n,
                      characters: n.characters.filter(c => c.id !== charId)
                  };
              }
              return n;
          }));
      }
  }, [currentNovelId]);

  const handleDeletePlotCard = useCallback((cardId: string, skipConfirm = false) => {
      if (skipConfirm || window.confirm("确定要删除这个情节卡吗？")) {
          setNovels(prev => prev.map(n => {
              if (n.id === currentNovelId && n.plotCards) {
                  return {
                      ...n,
                      plotCards: n.plotCards.filter(c => c.id !== cardId)
                  };
              }
              return n;
          }));
      }
  }, [currentNovelId]);

  // --- REFINED DELETE HANDLERS END ---

  const handleSelectNovel = (id: string) => {
      setCurrentNovelId(id);
      setViewMode('write');
  };

  // Memoized updaters to prevent unnecessary re-renders in children
  const handleUpdateNovel = useCallback((updatedNovel: Novel) => {
    setNovels(prev => prev.map(n => n.id === updatedNovel.id ? updatedNovel : n));
  }, []);

  const handleUpdateChapter = useCallback((updatedChapter: Chapter) => {
    updateActiveNovel(novel => ({
        ...novel,
        chapters: novel.chapters.map(c => c.id === updatedChapter.id ? updatedChapter : c)
    }));
    setHasUnsavedChanges(false); 
  }, [updateActiveNovel]);

  const handleOpenRenameModal = () => {
      if (activeNovel) {
          setRenameTitle(activeNovel.title);
          setShowRenameModal(true);
      }
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (activeNovel && renameTitle.trim()) {
          handleUpdateNovel({ ...activeNovel, title: renameTitle.trim() });
          setShowRenameModal(false);
      }
  };

  const handleOpenDescModal = () => {
      if (activeNovel) {
          setEditDescContent(activeNovel.description || '');
          setShowDescModal(true);
      }
  };

  const handleDescSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (activeNovel) {
          handleUpdateNovel({ ...activeNovel, description: editDescContent });
          setShowDescModal(false);
      }
  };

  // Stable callback for ChatPanel to prevent re-renders
  const handleUpdateChat = useCallback((newMessages: ChatMessage[]) => {
      updateActiveNovel(novel => ({ ...novel, chatHistory: newMessages }));
  }, [updateActiveNovel]);
  
  // Stable callback for ChatPanel
  const handleSaveToOutline = useCallback(async (type: 'global' | 'chapter' | 'volume', content: string) => {
      if (!activeNovel) return;
      
      if (type === 'chapter' && !activeChapter) {
          alert("未找到当前激活的章节，无法保存章节细纲。");
          return;
      }

      try {
          const summary = await summarizeForOutline(content, type);
          
          if (type === 'global') {
              const newOutline = activeNovel.outline 
                ? activeNovel.outline + "\n\n" + summary
                : summary;
              
              handleUpdateNovel({ ...activeNovel, outline: newOutline });
              alert("已总结并保存到全书大纲！");
          } else if (type === 'volume') {
             alert("请在“大纲” -> “分卷大纲”中指定要保存到的分卷。");
          } else if (type === 'chapter' && activeChapter) {
              const newChapterOutline = activeChapter.chapterOutline 
                ? activeChapter.chapterOutline + "\n\n" + summary
                : summary;
                
              handleUpdateChapter({ ...activeChapter, chapterOutline: newChapterOutline });
              alert(`已总结并保存到《${activeChapter.title}》细纲！`);
          }
      } catch (e) {
          console.error("Outline summary failed", e);
          alert("总结失败，请重试。");
      }
  }, [activeNovel, activeChapter, handleUpdateNovel, handleUpdateChapter]);

  const handleAddCharacter = useCallback((charData: Omit<Character, 'id'>) => {
      updateActiveNovel(novel => ({
          ...novel,
          characters: [...(novel.characters || []), { ...charData, id: Date.now().toString() }]
      }));
  }, [updateActiveNovel]);

  const handleUpdateCharacter = useCallback((id: string, charData: Omit<Character, 'id'>) => {
      updateActiveNovel(novel => ({
          ...novel,
          characters: (novel.characters || []).map(c => c.id === id ? { ...c, ...charData } : c)
      }));
  }, [updateActiveNovel]);

  const handleAddPlotCard = useCallback((cardData: Omit<PlotCard, 'id'>) => {
      updateActiveNovel(novel => ({
          ...novel,
          plotCards: [...(novel.plotCards || []), { ...cardData, id: Date.now().toString() }]
      }));
  }, [updateActiveNovel]);

  const handleUpdatePlotCard = useCallback((id: string, cardData: Omit<PlotCard, 'id'>) => {
      updateActiveNovel(novel => ({
          ...novel,
          plotCards: (novel.plotCards || []).map(c => c.id === id ? { ...c, ...cardData } : c)
      }));
  }, [updateActiveNovel]);
  
  const handleBatchUpdateSettings = useCallback((settings: Partial<{ characters: Character[], plots: PlotCard[] }>) => {
      updateActiveNovel(novel => {
          let newCharsCount = 0;
          let newPlotsCount = 0;

          const updatedCharacters = settings.characters ? (() => {
              const existingCharNames = new Set((novel.characters || []).map(c => c.name.trim()));
              const newChars = settings.characters.filter(c => c.name && !existingCharNames.has(c.name.trim()));
              newCharsCount = newChars.length;
              return [...(novel.characters || []), ...newChars.map(c => ({...c, id: Date.now().toString() + Math.random()}))];
          })() : novel.characters;

          const updatedPlotCards = settings.plots ? (() => {
              const existingPlotTitles = new Set((novel.plotCards || []).map(p => p.title.trim()));
              const newPlots = settings.plots.filter(p => p.title && !existingPlotTitles.has(p.title.trim()));
              newPlotsCount = newPlots.length;
              return [...(novel.plotCards || []), ...newPlots.map(p => ({...p, id: Date.now().toString() + Math.random()}))];
          })() : novel.plotCards;

          if (newCharsCount > 0 || newPlotsCount > 0) {
            alert(`成功导入 ${newCharsCount} 个新人物和 ${newPlotsCount} 个新情节卡！`);
          } else {
            alert(`未发现新的设定，AI提取的内容均已存在。`);
          }

          return {
              ...novel,
              characters: updatedCharacters,
              plotCards: updatedPlotCards,
          };
      });
  }, [updateActiveNovel]);

  const requestAiGeneration = (message: string, generationLogic: (useChatHistory: boolean) => Promise<void>) => {
    setUseRecentChat(true); // Reset check to true by default
    setAiConfirmation({
      message,
      onConfirm: async (useChatHistory) => {
        setAiConfirmation(null); // Close modal first
        await generationLogic(useChatHistory);
      },
    });
  };

  const handleGenerateChapterFromCard = async (card: PlotCard) => {
      if (!activeNovel) return;
      
      if (hasUnsavedChanges) {
          if (!window.confirm("生成新章节将切换页面，当前未保存的修改将丢失。是否继续？")) return;
          setHasUnsavedChanges(false);
      }

      requestAiGeneration(
        `根据情节卡《${card.title}》生成章节`,
        async (useChatHistory) => {
            setIsGeneratingChapter(true);
            try {
                // Limit individual message length to prevent massive payloads causing XHR errors
                // New logic: Use last 5 messages if useChatHistory is true, as requested by user
                const chatHistoryContext = (useChatHistory && activeNovel.chatHistory?.length)
                    ? activeNovel.chatHistory.slice(-5).map(m => `${m.role === 'user' ? '作者' : 'AI'}: ${(m.text || '').slice(0, 2000)}`).join('\n')
                    : undefined;
                    
                const involvedChars = (activeNovel.characters || []).filter(c => card.characterIds.includes(c.id));
                const content = await generateChapterFromPlot(card.summary, card.style, involvedChars, chatHistoryContext);
                
                const lastVolumeId = activeNovel.volumes?.[activeNovel.volumes.length - 1]?.id;
                if (!lastVolumeId) {
                  alert("请先创建一个分卷再生成章节。");
                  setIsGeneratingChapter(false);
                  return;
                }

                const newId = Date.now().toString();
                const newChapter: Chapter = {
                    id: newId,
                    volumeId: lastVolumeId,
                    title: card.title || `新章节`,
                    content: content,
                    chapterOutline: card.summary
                };

                handleUpdateNovel({ ...activeNovel, chapters: [...activeNovel.chapters, newChapter] });

                setActiveChapterMap(prev => ({ ...prev, [activeNovel.id]: newId }));
                setViewMode('write');
                setHasUnsavedChanges(true);

            } catch (e) {
                alert("生成章节失败，请稍后重试。");
                console.error(e);
            } finally {
                setIsGeneratingChapter(false);
            }
        }
      );
  };

  const handleAiGenerateNextChapter = async () => {
    if (!activeNovel || !nextChapterOutline.trim()) return;
    
    if (hasUnsavedChanges) {
        if (!window.confirm("生成新章节将切换页面，当前未保存的修改将丢失。是否继续？")) return;
        setHasUnsavedChanges(false);
    }

    setShowGenNextModal(false);

    requestAiGeneration(
        "AI 智能续写下一章",
        async (useChatHistory) => {
            setIsGeneratingChapter(true);
            try {
                const lastChapter = activeNovel.chapters[activeNovel.chapters.length - 1];
                const lastContent = lastChapter ? lastChapter.content : "";
                
                // Construct chat context if requested, sanitizing length
                // Updated: Take last 5 messages for focused context
                const chatHistoryContext = (useChatHistory && activeNovel.chatHistory?.length)
                    ? activeNovel.chatHistory.slice(-5).map(m => `${m.role === 'user' ? '作者' : 'AI'}: ${(m.text || '').slice(0, 2000)}`).join('\n')
                    : undefined;

                const content = await generateNextChapter(
                    lastContent,
                    activeNovel.outline || activeNovel.description || activeNovel.title, // Use Full Outline if available
                    nextChapterOutline,
                    activeNovel.characters || [],
                    chatHistoryContext
                );
                
                const lastVolumeId = lastChapter?.volumeId || activeNovel.volumes?.[activeNovel.volumes.length - 1]?.id;
                 if (!lastVolumeId) {
                  alert("请先创建一个分卷再生成章节。");
                  setIsGeneratingChapter(false);
                  return;
                }

                const newId = Date.now().toString();
                const newChapter: Chapter = {
                    id: newId,
                    volumeId: lastVolumeId,
                    title: `新章节`,
                    content: content,
                    chapterOutline: nextChapterOutline
                };

                handleUpdateNovel({ ...activeNovel, chapters: [...activeNovel.chapters, newChapter] });
                
                setNextChapterOutline('');
                setActiveChapterMap(prev => ({ ...prev, [activeNovel.id]: newId }));
                setHasUnsavedChanges(true);

            } catch (e) {
                console.error(e);
                alert("生成失败，请重试。");
            } finally {
                setIsGeneratingChapter(false);
            }
        }
    );
  };

  const handleAiGenerateChapterContent = async () => {
    if (!activeNovel || !activeChapter || isGeneratingChapter) return;

    if (!activeNovel.outline?.trim()) {
        alert("请先在“大纲”页面规划【全书大纲】后再使用此功能。");
        setViewMode('outline');
        return;
    }
    if (!activeChapter.chapterOutline?.trim()) {
        alert(`请先为章节《${activeChapter.title}》规划【分章细纲】后再使用此功能。`);
        setViewMode('outline');
        return;
    }

    if (hasUnsavedChanges && activeChapter.content.trim().length > 0 && !window.confirm("当前内容尚未保存，智能生成将会覆盖现有内容。是否继续？")) {
        return;
    }

    requestAiGeneration(
      `为章节《${activeChapter.title}》生成正文`,
      async (useChatHistory) => {
        setIsGeneratingChapter(true);
        try {
            const chapterIndex = activeNovel.chapters.findIndex(c => c.id === activeChapter.id);
            const previousChapter = chapterIndex > 0 ? activeNovel.chapters[chapterIndex - 1] : null;
            
            const parentVolume = activeNovel.volumes?.find(v => v.id === activeChapter.volumeId);
            const volumeOutlineForPrompt = parentVolume ? parentVolume.outline : '';

            // Construct chat context if requested (Last 5 messages for relevance), sanitizing length
            const chatHistoryContext = (useChatHistory && activeNovel.chatHistory?.length)
                ? activeNovel.chatHistory.slice(-5).map(m => `${m.role === 'user' ? '作者' : 'AI'}: ${(m.text || '').slice(0, 2000)}`).join('\n')
                : undefined;

            const generatedContent = await generateChapterFromOutlines(
                activeNovel.title,
                activeNovel.genre,
                activeNovel.outline || '',
                volumeOutlineForPrompt,
                chapterIndex,
                activeChapter.title,
                activeChapter.chapterOutline || '',
                previousChapter?.content || "这是小说的第一章。",
                activeNovel.characters || [],
                aiModelForGeneration,
                chatHistoryContext
            );

            updateActiveNovel(novel => ({
                ...novel,
                chapters: novel.chapters.map(c => 
                    c.id === activeChapter.id ? { ...c, content: generatedContent } : c
                )
            }));
            
            setHasUnsavedChanges(true);

        } catch (e) {
            console.error("Failed to generate chapter content:", e);
            alert("智能生成失败，请稍后重试。");
        } finally {
            setIsGeneratingChapter(false);
        }
      }
    );
  };

  const handleNewChapter = (volumeId?: string) => {
    if (!activeNovel) return;
    withUnsavedCheck(() => {
        const targetVolumeId = volumeId || activeNovel.volumes?.[activeNovel.volumes.length - 1]?.id;
        if (!targetVolumeId) {
            alert("请先创建一个分卷！");
            setViewMode('outline');
            return;
        }
        const newId = Date.now().toString();
        const newChapter: Chapter = { id: newId, volumeId: targetVolumeId, title: `新章节`, content: '', chapterOutline: '' };
        handleUpdateNovel({ ...activeNovel, chapters: [...activeNovel.chapters, newChapter] });
        setActiveChapterMap(prev => ({ ...prev, [activeNovel.id]: newId }));
    });
  };

  const handleNewVolume = () => {
    if (!activeNovel) return;
    const newId = `v${Date.now()}`;
    const newVolume: Volume = { id: newId, title: `新分卷 ${(activeNovel.volumes?.length || 0) + 1}`, outline: '' };
    updateActiveNovel(novel => ({
        ...novel,
        volumes: [...(novel.volumes || []), newVolume]
    }));
  };

  const switchChapter = (chapterId: string) => {
      if (!activeNovel) return;
      if (chapterId === activeChapterId) return;
      withUnsavedCheck(() => {
          setActiveChapterMap(prev => ({ ...prev, [activeNovel.id]: chapterId }));
      });
  };

  const handleExportNovel = (novelId: string) => {
      const novelToExport = novels.find(n => n.id === novelId);
      if (!novelToExport) return;
      const dataStr = JSON.stringify(novelToExport, null, 2);
      const element = document.createElement("a");
      const file = new Blob([dataStr], {type: 'application/json'});
      element.href = URL.createObjectURL(file);
      element.download = `${novelToExport.title}_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
  };

  const handleImportNovel = (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = event.target?.result as string;
              const importedNovel = JSON.parse(json) as Novel;
              if (!importedNovel.title || !importedNovel.chapters) {
                  alert("无效的项目文件格式");
                  return;
              }
              const newNovel = {
                  ...importedNovel,
                  id: Date.now().toString() + Math.random().toString().slice(2, 5), 
                  title: `${importedNovel.title} (导入)`,
                  characters: importedNovel.characters || [],
                  plotCards: importedNovel.plotCards || [],
                  volumes: importedNovel.volumes || [],
                  createdAt: new Date(importedNovel.createdAt || new Date())
              };
              setNovels(prev => [newNovel, ...prev]);
              alert("导入成功！");
          } catch (e) {
              console.error(e);
              alert("导入失败，文件可能已损坏。");
          }
      };
      reader.readAsText(file);
  };

  if (!activeNovel) {
      return (
          <Dashboard 
            novels={novels} 
            onCreateNovel={handleCreateNovel} 
            onSelectNovel={handleSelectNovel} 
            onImportNovel={handleImportNovel}
            onExportNovel={handleExportNovel}
            onDeleteNovel={handleDeleteNovel}
          />
      );
  }

  return (
    <div className="flex h-screen w-full bg-gray-100 text-gray-900 font-sans overflow-hidden">
      
      {/* 1. Activity Bar (Far Left) */}
      <ActivityBar 
        currentMode={viewMode} 
        onChangeMode={setViewMode} 
        onBack={handleBackToDashboard}
      />

      {/* 2. Sidebar / Chapter List (Conditionally rendered) */}
      {(viewMode === 'write' || viewMode === 'world') && (
        <div className="w-72 bg-ink text-gray-300 flex flex-col shrink-0 transition-all border-r border-gray-800 shadow-xl z-20 relative">
            {/* Project Header */}
            <div className="p-5 border-b border-gray-700 bg-[#252326]">
                <div className="flex items-center gap-2 group mb-2">
                    <h1 className="font-serif text-xl text-white font-bold tracking-wide truncate leading-tight flex-1" title={activeNovel.title}>
                        {activeNovel.title}
                    </h1>
                    <button 
                        onClick={handleOpenDescModal}
                        className="text-gray-500 hover:text-indigo-400 transition-all p-1 rounded hover:bg-gray-800"
                        title="修改简介"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </button>
                    <button 
                        onClick={handleOpenRenameModal}
                        className="text-gray-500 hover:text-indigo-400 transition-all p-1 rounded hover:bg-gray-800"
                        title="修改名称"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs mb-3">
                    <div className="flex items-center text-gray-400">
                        {activeNovel.author}
                    </div>
                    <div className="flex items-center text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded-full border border-indigo-900/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-50 mr-1.5"></span>
                        {activeNovel.genre}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar py-4 flex flex-col">
                <div className="px-5 mb-3 flex justify-between items-end">
                    <h2 className="text-xs font-bold uppercase text-gray-500 tracking-wider">章节列表</h2>
                    <span className="text-[10px] text-gray-600">{activeNovel.chapters.length} 章节</span>
                </div>
                
                <ul className="space-y-0.5 flex-1">
                    {activeNovel.chapters.map((chapter, idx) => (
                        <li key={chapter.id}>
                            <button
                                onClick={() => switchChapter(chapter.id)}
                                className={`w-full text-left px-5 py-2.5 text-sm truncate transition-all border-l-2 group flex items-center ${
                                    activeChapterId === chapter.id 
                                    ? 'bg-gray-800 text-white border-indigo-500 font-medium' 
                                    : 'border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 hover:border-gray-600'
                                }`}
                            >
                                <span className={`mr-3 text-xs font-mono w-4 text-right ${activeChapterId === chapter.id ? 'text-indigo-400' : 'opacity-30 group-hover:opacity-50'}`}>
                                    {idx + 1}
                                </span>
                                <span className="truncate">{chapter.title}</span>
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="px-4 mt-4 space-y-2 pb-4">
                    <button 
                        onClick={() => setShowGenNextModal(true)}
                        disabled={isGeneratingChapter}
                        className="w-full py-2 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-700/50 rounded text-xs text-indigo-200 hover:text-white hover:border-indigo-500 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        {isGeneratingChapter ? <Spinner className="w-3 h-3" /> : "AI 生成下一章"}
                    </button>
                    <button 
                        onClick={() => handleNewChapter()}
                        className="w-full py-2 border border-dashed border-gray-700 rounded text-xs text-gray-500 hover:border-gray-500 hover:text-gray-300 transition-all flex items-center justify-center gap-2"
                    >
                        新建空白章节
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative transition-all bg-gray-100">
          {viewMode === 'outline' ? (
              <OutlineManager 
                  key={activeNovel.id} // Ensure component resets on novel switch
                  novel={activeNovel}
                  onUpdateNovel={handleUpdateNovel}
                  onUpdateChapter={handleUpdateChapter}
                  requestAiGeneration={requestAiGeneration}
                  onNewVolume={handleNewVolume}
                  onNewChapter={handleNewChapter}
              />
          ) : viewMode === 'chat' ? (
               <ChatPanel 
                  key={activeNovel.id + 'chat'} 
                  context={activeChapter?.content || ''} 
                  initialMessages={activeNovel.chatHistory || []}
                  onMessagesUpdate={handleUpdateChat}
                  onSaveToOutline={handleSaveToOutline}
                  fullScreen={true}
               />
          ) : viewMode === 'stats' ? (
               <StatisticsPanel novel={activeNovel} />
          ) : viewMode === 'world' ? (
                <WorldPanel 
                    novel={activeNovel}
                    onAddCharacter={handleAddCharacter}
                    onUpdateCharacter={handleUpdateCharacter}
                    onDeleteCharacter={handleDeleteCharacter}
                    onAddPlotCard={handleAddPlotCard}
                    onUpdatePlotCard={handleUpdatePlotCard}
                    onDeletePlotCard={handleDeletePlotCard}
                    onGenerateChapter={handleGenerateChapterFromCard}
                    onBatchUpdateSettings={handleBatchUpdateSettings}
                    isGenerating={isGeneratingChapter}
                    requestAiGeneration={requestAiGeneration}
                />
          ) : ( // Default to 'write'
              <NovelEditor 
                  ref={editorRef}
                  activeChapter={activeChapter} 
                  onUpdateChapter={handleUpdateChapter}
                  isChatOpen={false} // Chat is now a separate mode
                  onToggleChat={() => setViewMode('chat')}
                  setHasUnsavedChanges={setHasUnsavedChanges}
                  hasUnsavedChanges={hasUnsavedChanges}
                  onAiGenerate={handleAiGenerateChapterContent}
                  isGeneratingContent={isGeneratingChapter}
                  selectedAiModel={aiModelForGeneration}
                  onSelectAiModel={setAiModelForGeneration}
                  requestAiGeneration={requestAiGeneration}
                  chatHistory={activeNovel.chatHistory || []}
              />
          )}
      </div>

      {/* --- MODALS --- */}

      {/* Universal AI Confirmation Modal */}
      {aiConfirmation && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform scale-100 transition-transform">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-full bg-indigo-100 text-indigo-600">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-gray-900">{aiConfirmation.message}</h3>
                      </div>
                  </div>
                  
                  <div className="mb-6 px-2">
                       <label className="flex items-center gap-3 p-3 border border-indigo-100 bg-indigo-50 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={useRecentChat}
                                onChange={(e) => setUseRecentChat(e.target.checked)}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                            />
                            <div>
                                <span className="block text-sm font-medium text-gray-800">引用最近 5 条聊天记录</span>
                                <span className="block text-xs text-gray-500 mt-0.5">AI 将智能筛选并提取相关灵感，而非全盘照搬。</span>
                            </div>
                       </label>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6">
                      <button 
                          onClick={() => setAiConfirmation(null)}
                          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                      >
                          取消
                      </button>
                      <button 
                          onClick={() => aiConfirmation.onConfirm(useRecentChat)}
                          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2"
                      >
                          开始生成
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
            <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                 <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-sm p-4 shadow-2xl">
                    <h3 className="text-white font-bold mb-3 text-sm">修改小说名称</h3>
                    <form onSubmit={handleRenameSubmit}>
                        <input
                            value={renameTitle}
                            onChange={(e) => setRenameTitle(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none mb-4"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button 
                                type="button"
                                onClick={() => setShowRenameModal(false)}
                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-transparent hover:bg-gray-800 rounded"
                            >
                                取消
                            </button>
                            <button 
                                type="submit"
                                disabled={!renameTitle.trim()}
                                className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50"
                            >
                                确认修改
                            </button>
                        </div>
                    </form>
                </div>
            </div>
      )}

      {/* Edit Description Modal */}
      {showDescModal && (
            <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                 <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg p-4 shadow-2xl">
                    <h3 className="text-white font-bold mb-3 text-sm">修改作品简介</h3>
                    <form onSubmit={handleDescSubmit}>
                        <textarea
                            value={editDescContent}
                            onChange={(e) => setEditDescContent(e.target.value)}
                            className="w-full h-48 bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none resize-none mb-4 custom-scrollbar"
                            placeholder="请输入作品简介..."
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button 
                                type="button"
                                onClick={() => setShowDescModal(false)}
                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-transparent hover:bg-gray-800 rounded"
                            >
                                取消
                            </button>
                            <button 
                                type="submit"
                                className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500"
                            >
                                确认修改
                            </button>
                        </div>
                    </form>
                </div>
            </div>
      )}

      {/* AI Generate Next Chapter Modal */}
      {showGenNextModal && (
            <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-sm p-4 shadow-2xl">
                    <h3 className="text-white font-bold mb-1 text-sm flex items-center gap-2">
                        智能续写下一章
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">基于上一章内容和小说背景进行续写。</p>
                    
                    <textarea
                        value={nextChapterOutline}
                        onChange={(e) => setNextChapterOutline(e.target.value)}
                        placeholder="请输入本章的大致剧情走向、发生的核心冲突或关键转折..."
                        className="w-full h-32 bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none resize-none mb-3"
                        autoFocus
                    />
                    
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => setShowGenNextModal(false)}
                            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-transparent hover:bg-gray-800 rounded"
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleAiGenerateNextChapter}
                            disabled={!nextChapterOutline.trim()}
                            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            开始生成
                        </button>
                    </div>
                </div>
            </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform scale-100 transition-transform">
                  <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-full ${hasUnsavedChanges ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                          {hasUnsavedChanges ? (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                          ) : (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                          )}
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-gray-900">{hasUnsavedChanges ? "当前进度未保存" : "确认退出"}</h3>
                          <p className="text-sm text-gray-500">
                              {hasUnsavedChanges 
                                ? "当前章节有未保存的修改，直接退出将导致修改丢失。" 
                                : "当前的修改已保存。确认返回项目列表吗？"}
                          </p>
                      </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6">
                      <button 
                          onClick={() => setShowExitModal(false)}
                          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                          取消
                      </button>
                      
                      {hasUnsavedChanges ? (
                          <>
                              <button 
                                  onClick={() => handleConfirmExit(false)}
                                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                              >
                                  不保存退出
                              </button>
                              <button 
                                  onClick={() => handleConfirmExit(true)}
                                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2"
                              >
                                  保存并退出
                              </button>
                          </>
                      ) : (
                          <button 
                              onClick={() => handleConfirmExit(false)}
                              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
                          >
                              确认退出
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;