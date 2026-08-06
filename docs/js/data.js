// ===== 大勇士小英语 · 内容数据 =====
const APP_NAME = '大勇士小英语';

// 素材图片（来自桌面「儿童英语素材」，已压缩到 images/ 目录）
const IMG = {
  leo: 'images/img01.png',       // 雀斑男孩
  lily: 'images/img02.png',      // 双马尾女孩
  mia: 'images/img03.png',       // 橘猫（向导）
  schoolKid: 'images/img04.png', // 眼镜男孩
  buddy: 'images/img05.png',     // 垂耳小狗（向导）
  sportGirl: 'images/img06.png', // 运动女孩
  rabbit: 'images/img07.png',    // 小白兔
  tom: 'images/img08.png',       // 工装男孩
  bear: 'images/img09.png',      // 棕熊
  braidGirl: 'images/img10.png', // 麻花辫女孩
  robotKid: 'images/img11.png',  // 爆炸头男孩
  fox: 'images/img12.png',       // 小狐狸
  princess: 'images/img13.png',  // 公主裙女孩
  duck: 'images/img14.png',      // 小鸭子
  panda: 'images/img15.png'      // 小熊猫
};

// 预置账号（MVP 测试用）
const ACCOUNTS = [
  { id: 'stu01', name: '小勇士 01', avatar: '🐱', img: IMG.mia },
  { id: 'stu02', name: '小勇士 02', avatar: '🐶', img: IMG.buddy },
  { id: 'stu03', name: '小勇士 03', avatar: '🐻', img: IMG.princess },
  { id: 'stu04', name: '小勇士 04', avatar: '🦊', img: IMG.fox },
  { id: 'stu05', name: '小勇士 05', avatar: '🐼', img: IMG.panda },
  { id: 'stu06', name: '小勇士 06', avatar: '🐨', img: IMG.sportGirl },
  { id: 'stu07', name: '小勇士 07', avatar: '🐰', img: IMG.rabbit },
  { id: 'stu08', name: '小勇士 08', avatar: '🐯', img: IMG.duck },
  { id: 'stu09', name: '小勇士 09', avatar: '🦁', img: IMG.bear },
  { id: 'stu10', name: '小勇士 10', avatar: '🐸', img: IMG.braidGirl }
];

// 称号体系（按累计星星数解锁）
const TITLES = [
  { min: 0,  name: '英语小新星', icon: '⭐' },
  { min: 4,  name: '跟读小达人', icon: '🎤' },
  { min: 8,  name: '排序小能手', icon: '🧩' },
  { min: 12, name: '记忆小天才', icon: '🧠' },
  { min: 16, name: '故事大王',   icon: '👑' },
  { min: 24, name: '英语小博士', icon: '🎓' }
];

// 闯关关卡：0 听一听 / 1 跟读 / 2 排一排 / 3 记一记
const LEVEL_NAMES = ['听一听', '跟读闯关', '排一排', '记一记'];
const LEVEL_ICONS = ['🎧', '🎤', '🧩', '🧠'];

// 每个角色的专属颜色（视觉区分）
const SPEAKER_COLORS = {
  Leo:  '#4FC3F7', // 蓝
  Lily: '#FF7BAC', // 粉
  Tom:  '#7ED6A5', // 绿
  Robo: '#B39DDB'  // 紫
};
// 每个角色的立绘
const SPEAKER_IMG = {
  Leo: IMG.leo,
  Lily: IMG.lily,
  Tom: IMG.tom
};

// 回忆关可以挖空的词（动词/形容词/功能词，避开人名和物品名词）
const BLANK_WORDS = [
  'am', 'is', 'are', 'has', 'have', 'can', 'do', 'does', 'like', 'want',
  'go', 'goes', 'come', 'look', 'watch', 'read', 'run', 'jump', 'play', 'meet',
  'help', 'pick', 'put', 'say', 'talk', 'dance', 'learn', 'clean', 'count', 'make',
  'get', 'take', 'let', 'us',
  'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that', 'these', 'those',
  'the', 'a', 'an', 'in', 'on', 'at', 'to', 'too', 'up', 'with',
  'and', 'but', 'for', 'of', 'from', 'one', 'two', 'three',
  'very', 'good', 'new', 'funny', 'happy', 'beautiful', 'sunny', 'little', 'big', 'together',
  'today', 'yes', 'no', 'oh', 'wow', 'well', 'nice', 'great', 'hello', 'hi', 'thank', 'welcome', 'please'
];

// 主题与短文内容（原创，难度由易到难）
const THEMES = [
  {
    id: 'school',
    name: '校园生活',
    icon: '🏫',
    color: '#FF9F43',
    desc: '交新朋友、开心上学',
    bannerImg: IMG.schoolKid,
    passages: [
      {
        id: 'p1',
        type: 'dialog',
        title: '新朋友 New Friends',
        cover: IMG.leo,
        lines: [
          { who: 'Leo',  text: 'Hi! I am Leo. What is your name?' },
          { who: 'Lily', text: 'Hi, Leo! My name is Lily.' },
          { who: 'Leo',  text: 'Nice to meet you, Lily.' },
          { who: 'Lily', text: 'Nice to meet you, too.' },
          { who: 'Leo',  text: 'This is my friend, Tom.' },
          { who: 'Tom',  text: 'Hello, Lily. Welcome to our class!' },
          { who: 'Lily', text: 'Thank you! I like your school.' },
          { who: 'Leo',  text: 'Can you play with us?' },
          { who: 'Lily', text: 'Yes, I can. Let us go!' }
        ],
        words: [['meet', '遇见'], ['friend', '朋友'], ['welcome', '欢迎'], ['class', '班级'], ['play', '玩']]
      },
      {
        id: 'p2',
        type: 'story',
        title: '快乐的一天 A Busy Day',
        cover: IMG.sportGirl,
        lines: [
          { who: '', text: 'Today is Monday. Leo goes to school.' },
          { who: '', text: 'He has English, maths and PE today.' },
          { who: '', text: 'In English class, he reads a funny story.' },
          { who: '', text: 'In maths class, he counts to one hundred.' },
          { who: '', text: 'In PE class, he runs and jumps with Tom.' },
          { who: '', text: 'Leo says, "School is fun!"' }
        ],
        words: [['Monday', '星期一'], ['maths', '数学'], ['funny', '有趣的'], ['hundred', '一百']]
      }
    ]
  },
  {
    id: 'robot',
    name: 'AI 小助手',
    icon: '🤖',
    color: '#4FC3F7',
    desc: '认识会说话的机器人朋友',
    bannerImg: IMG.robotKid,
    passages: [
      {
        id: 'p1',
        type: 'dialog',
        title: '我的机器人 My Robot',
        cover: IMG.robotKid,
        lines: [
          { who: 'Leo',  text: 'Look, Lily! This is my robot. His name is Robo.' },
          { who: 'Lily', text: 'Wow! Can he talk?' },
          { who: 'Robo', text: 'Hello, Lily. Nice to meet you!' },
          { who: 'Lily', text: 'Hello, Robo. Can you dance?' },
          { who: 'Robo', text: 'Yes, I can. One, two, three. Look at me!' },
          { who: 'Leo',  text: 'Ha ha! Very good!' },
          { who: 'Lily', text: 'Can he help us learn English?' },
          { who: 'Leo',  text: 'Yes. He can read with us.' },
          { who: 'Robo', text: 'Let us read together. I am your friend.' }
        ],
        words: [['robot', '机器人'], ['talk', '说话'], ['dance', '跳舞'], ['learn', '学习'], ['together', '一起']]
      },
      {
        id: 'p2',
        type: 'story',
        title: '机器人打扫公园 Robo Cleans the Park',
        cover: IMG.rabbit,
        lines: [
          { who: '', text: 'One sunny day, Leo and Lily go to the park.' },
          { who: '', text: 'Oh no! There is a lot of rubbish on the grass.' },
          { who: '', text: 'Leo says, "Let us help the park."' },
          { who: '', text: 'Robo says, "I can help too!"' },
          { who: '', text: 'Robo picks up the bottles. Leo picks up the paper.' },
          { who: '', text: 'Lily puts the rubbish in the bin.' },
          { who: '', text: 'The park is clean and beautiful now.' },
          { who: '', text: 'Everyone says, "Well done, Robo!"' }
        ],
        words: [['sunny', '晴朗的'], ['rubbish', '垃圾'], ['grass', '草地'], ['bottle', '瓶子'], ['bin', '垃圾桶']]
      }
    ]
  }
];