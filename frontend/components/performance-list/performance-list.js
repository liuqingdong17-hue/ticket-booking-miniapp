Component({
  properties: {
    performances: {
      type: Array,
      value: [],
      observer(newVal) {
        if (!Array.isArray(newVal)) return;
      
        const enhanced = newVal.map(p => {
          // ✅ 用 status 控制上下架：0=下架，1=上架（兼容字符串）
          const st = Number(p.status);
          const isOff = !isNaN(st) ? st === 0 : false;
      
          // ✅ 统一处理艺人显示：0个不显示，>3 省略
          let artistArr = [];
          if (Array.isArray(p.artists)) {
            artistArr = p.artists;
          } else if (typeof p.artists === 'string') {
            artistArr = p.artists
              .split(/[,/|、]/)
              .map(s => s.trim())
              .filter(Boolean);
          } else {
            artistArr = [];
          }
      
          const artist_text =
            artistArr.length === 0
              ? ''
              : (artistArr.length > 3
                  ? `${artistArr.slice(0, 3).join(' / ')}...`
                  : artistArr.join(' / '));
      
          return {
            ...p,
            isOff,                 // ✅ 新字段：用于显示“已下架”
            artist_text,
            artist_count: artistArr.length
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
    internalPerformances: []
  },

  methods: {
    onCardTap(e) {
      const id = e.currentTarget.dataset.id;
      this.triggerEvent('cardTap', { id });
    }
  }
});

