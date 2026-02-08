const app = Vue.createApp({
  setup() {
    document.body.removeAttribute("hidden");
  },
  data() {
    return {
      comments: [],
    };
  },
  methods: {
    getClassName(comment) {
      if (comment.commentIndex % 2 === 0) {
        return "comment even";
      }
      return "comment odd";
    },
    getStyle(comment) {
      if (comment.data.colors) {
        // スパチャも通常コメントと完全に同じ見た目にする
        // カスタムスタイルを返さないことで、CSSのデフォルト設定を使用
        return {};
      }
    },
  },
  mounted() {
    let cache = new Map();
    let commentIndex = 0;
    OneSDK.setup({
      permissions: OneSDK.usePermission([OneSDK.PERM.COMMENT]),
    });
    OneSDK.subscribe({
      action: "comments",
      callback: (comments) => {
        const newCache = new Map();
        comments.forEach((comment) => {
          const index = cache.get(comment.data.id);
          if (isNaN(index)) {
            comment.commentIndex = commentIndex;
            newCache.set(comment.data.id, commentIndex);
            ++commentIndex;
          } else {
            comment.commentIndex = index;
            newCache.set(comment.data.id, index);
          }
        });
        cache = newCache;
        this.comments = comments;
      },
    });
    OneSDK.connect();
  },
});
app.component("one-marquee", window.OneMarquee());
OneSDK.ready().then(() => {
  app.mount("#container");
});
