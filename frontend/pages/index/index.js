// index.js
Page({
  data: {
    keyword: '',
    categories: [
      { id: 1, name: '演唱会', icon: '/images/music.png' },
      { id: 2, name: '话剧', icon: '/images/drama.png' },
      { id: 3, name: '体育', icon: '/images/sport.png' },
      { id: 4, name: '脱口秀', icon: '/images/comedy.png' },
      { id: 5, name: '舞剧', icon: '/images/dance.png' },
      { id: 6, name: '戏曲相声', icon: '/images/opera.png' },
      { id: 7, name: '音乐会', icon: '/images/concert.png' },
      { id: 8, name: '音乐节', icon: '/images/festival.png' },
      { id: 9, name: '展览', icon: '/images/exhibit.png' },
    ]
  },
  onSearch(e) {
    const keyword = e.detail.value;
    console.log('搜索关键词：', keyword);
    // TODO: 可跳转到搜索结果页或过滤本页数据
  },

  onCategoryTap(e) {
    const categoryId = e.currentTarget.dataset.id;
    console.log('点击分类：', categoryId);
    // TODO: 可跳转至搜索结果或分类演出页
  }
});
