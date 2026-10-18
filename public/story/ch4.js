// 第四章 · 云上列车
(function (root) {
  var CH = {
    id: 'ch4',
    title: '第四章 · 云上列车',
    start: 'open',
    nodes: {
      open: {
        type: 'dialog',
        bg: { A: 'station', B: 'airship' },
        lines: {
          A: [
            ['B', '{A}，有个船长说要带我去云海找碎片，他叫维克多。'],
            ['A', '一个陌生的大胡子？你就这么上了他的飞艇？'],
            ['B', '他请我吃了一整盘蜂蜜饼干。'],
            ['A', '……{B}！'],
            ['tuanzi', '蜂蜜饼干确实是很难拒绝的。'],
            ['narr', '{lamp}上的地图显示，第四、第五块碎片都在云海上空，离晨岸也不远。'],
            ['narr', '你带着团子和小米，买了一张「云上列车」的车票。'],
            ['narr', '列车沿着云做的铁轨开出站台，车窗外全是棉花糖一样的云。'],
            ['narr', '列车长是一只戴着圆眼镜的大白鹅。「欢迎乘车，」他用翅膀推了推眼镜，「请勿在车厢内追逐打闹，尤其是你，狐狸。」'],
            ['tuanzi', '他怎么知道我想追小米。']
          ],
          B: [
            ['narr', '信天翁号的甲板上，风把你的头发吹得乱七八糟。'],
            ['narr', '维克多船长掌着舵，一边哼着走调的歌，一边往嘴里扔饼干。'],
            ['narr', '「你那半盏灯，」他眯起眼睛，「我年轻时在一本书里见过。传说它能让灯桥重新亮起来，是不是？」'],
            ['B', '您知道灯桥的事？'],
            ['narr', '「整个云海，没人比我更想看到灯桥亮起来。」他笑了笑，没有再说下去。'],
            ['chilun', '……咔。（齿轮盯着船长，尾巴一动不动）'],
            ['narr', '远处的云层里，一列小火车正沿着云轨开过来。'],
            ['B', '{A}，我好像看到你坐的火车了！']
          ]
        },
        next: 'engine_intro'
      },

      engine_intro: {
        type: 'dialog',
        bg: { A: 'train', B: 'airship' },
        both: [
          ['narr', '「咣当」一声，列车猛地一晃，慢了下来。'],
          ['narr', '「锅炉！锅炉要罢工了！」鹅列车长扑棱着翅膀冲进车厢，「司机在打瞌睡，谁会修机器？」'],
          ['A', '我不会修，但是我有个会修钟的朋友。'],
          ['B', '我在船长的书架上找到一本《云上列车 · 锅炉操作守则》！他什么书都收。'],
          ['A', '那你看规则，我来按按钮。']
        ],
        next: 'p1'
      },

      p1: {
        type: 'puzzle', kind: 'manual', manual: 'engine', seer: 'B', rounds: 3,
        bg: { A: 'train', B: 'paper' },
        next: 'signal_intro'
      },

      signal_intro: {
        type: 'dialog',
        bg: { A: 'train', B: 'airship' },
        both: [
          ['narr', '锅炉发出一声满足的「噗」，列车重新跑了起来。'],
          ['narr', '「大恩不言谢，」鹅列车长说，「不过前面是雾区，信号塔在雾上面，我从车里看不见。」'],
          ['B', '我在飞艇上看得见！信号塔上的灯在一闪一闪。'],
          ['A', '那你告诉我信号的顺序，我来拉驾驶室的信号杆。']
        ],
        next: 'p2'
      },

      p2: {
        type: 'puzzle', kind: 'simon', seer: 'B', rounds: [4, 5, 6],
        bg: { A: 'train', B: 'airship' },
        ui: {
          A: { title: '驾驶室的四根信号杆', sub: '按 {B} 报的顺序拉' },
          B: { title: '雾上面的信号塔', sub: '把灯闪烁的顺序报给 {A}' }
        },
        next: 'luggage_intro'
      },

      luggage_intro: {
        type: 'dialog',
        bg: { A: 'train', B: 'airship' },
        both: [
          ['narr', '列车穿出雾区，阳光一下子洒满了车厢。'],
          ['A', '{lamp}在发烫，第四块碎片就在这列车上！在……行李车厢。'],
          ['narr', '行李车厢里堆满了箱子、帽盒和包裹。'],
          ['narr', '「有意思，」船长凑到{B}身边，「我昨天也坐过这班车，还拍了张行李车厢的照片。」'],
          ['B', '那我们对一对，昨天到今天被人动过的东西，说不定就是藏碎片的地方。']
        ],
        next: 'p3'
      },

      p3: {
        type: 'puzzle', kind: 'diff', skin: 'luggage', w: 5, h: 5, diffs: 4,
        bg: { A: 'train', B: 'airship' },
        ui: {
          A: { title: '今天的行李车厢', sub: '和 {B} 手里的照片对一对，找出 4 处不同' },
          B: { title: '船长昨天拍的照片', sub: '和 {A} 眼前的车厢对一对，找出 4 处不同' }
        },
        next: 'island_intro'
      },

      island_intro: {
        type: 'dialog',
        bg: { A: 'train', B: 'airship' },
        both: [
          ['narr', '第四块碎片藏在一只旧帽盒里。小米一爪子就把它勾了出来。'],
          ['narr', '「好猫。」鹅列车长说。小米假装没听见，但尾巴翘起来了。'],
          ['B', '第五块碎片在前面那座浮岛上！可是火车不停，飞艇也靠不了岸，岛太小了。'],
          ['narr', '「小学徒，」船长把一根带钩子的绳子塞到{B}手里，「我把飞艇压低，你把钩子挂到岛上的树上。」'],
          ['A', '同时我在火车上拉紧急刹车，让火车正好停在岛边。'],
          ['B', '要同时！早了晚了都会错过。']
        ],
        next: 'p4'
      },

      p4: {
        type: 'puzzle', kind: 'sync', rounds: 3, window: 800,
        bg: { A: 'train', B: 'airship' },
        ui: {
          A: { title: '拉紧急刹车', sub: '和 {B} 一起数到三，同时按。要连续成功三次', button: '刹车！' },
          B: { title: '抛出钩子', sub: '和 {A} 一起数到三，同时按。要连续成功三次', button: '抛钩！' }
        },
        next: 'riddle_intro'
      },

      riddle_intro: {
        type: 'dialog',
        bg: { A: 'island', B: 'island' },
        both: [
          ['narr', '火车停在了浮岛边，飞艇也稳稳地挂在了树上。'],
          ['narr', '你们在岛上转了一圈，却没找到第五块碎片。'],
          ['narr', '「找这个吗？」船长从怀里掏出一块碎片，在指尖转了转，「很多年前我在这座岛上捡到的。」'],
          ['B', '您怎么不早说！'],
          ['narr', '「我是个收藏家，东西不能白给。」他眨眨眼，「这样，我出个谜，你们俩答对了，它就归你们。」'],
          ['narr', '「我的故乡在哪？我给你们一人一半提示。」']
        ],
        next: 'p5'
      },

      p5: {
        type: 'puzzle', kind: 'riddle',
        bg: { A: 'island', B: 'island' },
        question: '维克多船长的故乡在哪里？',
        clues: {
          A: [
            '船长悄悄告诉你的一半提示：',
            '「我的故乡不在晨岸，也不在暮港。」',
            '「我小时候每天都能看见灯桥，近得像能摸到。」',
            '「那里的人都会唱歌，所以叫这个名字。」'
          ],
          B: [
            '船长悄悄告诉你的另一半提示：',
            '「后来，我的故乡沉进了云里。」',
            '「从那以后，我再也没听过那里的歌。」',
            '「它就在灯桥下面，云海的正中央。」'
          ]
        },
        options: [
          { id: 'chen', text: '晨岸的山村' }, { id: 'mu', text: '暮港的渔村' }, { id: 'yunge', text: '云海正中央的云歌镇' }, { id: 'island', text: '这座浮岛' }
        ],
        answer: 'yunge',
        next: 'camp'
      },

      camp: {
        type: 'dialog',
        bg: { A: 'night', B: 'night' },
        both: [
          ['narr', '「云歌镇。」船长把碎片放进你们手里，声音一下子轻了，「答对了。」'],
          ['narr', '那天晚上，火车停在浮岛边过夜，飞艇挂在树上。船长在甲板上生了一小堆火。'],
          ['narr', '「灯桥熄灭的那天晚上，云海翻起了大浪。我家的小镇，就那么沉下去了。」'],
          ['narr', '「我那时候比你们还小。我妈妈最后一句话是：别怕，会有人把灯点回来的。」'],
          ['narr', '「我等了七十年。」'],
          ['B', '船长……'],
          ['narr', '「好啦，」他拍拍膝盖站起来，「老头子讲故事讲困了。你们俩聊吧。」'],
          ['narr', '火光慢慢暗下去。灯里只剩你们两个人的声音。'],
          ['A', '{B}，你说等灯桥亮了，我们见面的时候，第一件事做什么？']
        ],
        next: 'meet'
      },

      meet: {
        type: 'choice',
        prompt: '见面的时候，第一件事做什么？',
        flag: 'meet',
        options: [
          { id: 'food', text: '一起去吃一顿好吃的' },
          { id: 'sunrise', text: '一起看一次日出' },
          { id: 'hug', text: '先给对方一个拥抱' }
        ],
        next: 'night_end'
      },

      night_end: {
        type: 'dialog',
        bg: { A: 'night', B: 'night' },
        both: [
          ['A', '那就说好了，吃最好吃的。我请客。', { f: 'meet', v: 'food' }],
          ['B', '我要吃三份甜点。', { f: 'meet', v: 'food' }],
          ['A', '那就说好了，一起看日出。', { f: 'meet', v: 'sunrise' }],
          ['B', '我会早起的。这次真的会。', { f: 'meet', v: 'sunrise' }],
          ['A', '那就说好了，先抱一下。', { f: 'meet', v: 'hug' }],
          ['B', '……嗯。说好了。', { f: 'meet', v: 'hug' }],
          ['narr', '五块碎片了，还差两块。'],
          ['narr', '半夜，{B}被齿轮轻轻咬醒。'],
          ['chilun', '……船长……身上……有碎片的味道……不止一块……'],
          ['B', '什么意思？'],
          ['chilun', '……咔。'],
          ['narr', '甲板上，船长一个人站在船头，望着云海正中央，很久很久都没动。']
        ],
        next: 'end'
      },

      end: { type: 'end', title: '第四章 · 云上列车', next: 'ch5' }
    }
  };
  root.STORY = root.STORY || {};
  root.STORY[CH.id] = CH;
  if (typeof module !== 'undefined') module.exports = CH;
})(typeof window !== 'undefined' ? window : globalThis);
