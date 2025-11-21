Component({
  properties: {
    performances: {
      type: Array,
      value: [],
      observer(newVal) {
        if (!Array.isArray(newVal)) return;

        const now = Date.now();
        const enhanced = newVal.map(p => {
          // 防止 iOS 日期解析报 NaN
          const ts = new Date(String(p.start_time || '').replace(/-/g, '/')).getTime();
          return {
            ...p,
            isExpired: !isNaN(ts) && ts < now   // 判断是否已下架
          };
        });

        this.setData({ internalPerformances: enhanced });
      }
    },
    hasMore: {
      type: Boolean,
      value: true
    }
  },

  data: {
    internalPerformances: []  // 内部渲染用的数据，带 isExpired
  },

  methods: {
    onScrollToLower() {
      this.triggerEvent('loadMore');
    },
    onCardTap(e) {
      const id = e.currentTarget.dataset.id;
      this.triggerEvent('cardTap', { id });
    }
  }
});
