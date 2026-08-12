class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.content = this.mainDetailsToggle.querySelector('summary').nextElementSibling;

    this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');
    this.closeTimer = null;
    this.CLOSE_DELAY = 150; // 关闭延迟 ms，防止划过间隙时关闭
    this.ANIMATION_DURATION = 300; // 动画持续时间 ms
    this.MAX_EXPAND_HEIGHT = 600; // 与 CSS .is-open max-height 保持一致，防止动画结束时跳变
    this._isDesktop = window.matchMedia('(min-width: 990px)');

    // 绑定事件
    this._onMouseEnter = this.onMouseEnter.bind(this);
    this._onMouseLeave = this.onMouseLeave.bind(this);
    this.mainDetailsToggle.addEventListener('mouseenter', this._onMouseEnter);
    this.mainDetailsToggle.addEventListener('mouseleave', this._onMouseLeave);
    this.mainDetailsToggle.querySelector('summary').addEventListener('click', this.onSummaryClick.bind(this));

    // 监听断点变化，切换 hover 模式
    this._breakpointHandler = (e) => {
      if (!e.matches) {
        // 切换到移动端：清理桌面端残留状态
        this._cleanupDesktopState();
      }
    };
    this._isDesktop.addEventListener('change', this._breakpointHandler);
  }

  // 判断当前是否桌面端
  get isDesktop() {
    return this._isDesktop.matches;
  }

  onMouseEnter() {
    if (!this.isDesktop) return;

    // 清除待执行的关闭定时器
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }

    // 关闭其他同级的 header-menu
    this.closeOtherMenus();

    // 打开当前菜单
    this.open();
  }

  onMouseLeave() {
    if (!this.isDesktop) return;

    // 延迟关闭，防止鼠标划过 summary 与 submenu 之间的间隙时菜单关闭
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.closeWithAnimation();
    }, this.CLOSE_DELAY);
  }

  onSummaryClick(event) {
    // 在桌面端，我们完全用 hover 控制，禁用原生的点击切换
    if (this.isDesktop) {
      event.preventDefault();
      event.stopPropagation();
      // 如果当前未打开（可能由于某些原因），则打开
      if (!this.mainDetailsToggle.hasAttribute('open')) {
        this.open();
      }
    }
  }

  closeOtherMenus() {
    const allMenus = document.querySelectorAll('header-menu');
    allMenus.forEach((menu) => {
      if (menu !== this && menu.mainDetailsToggle && menu.mainDetailsToggle.hasAttribute('open')) {
        menu.closeWithAnimation();
      }
    });
  }

  open() {
    const submenu = this.content;
    if (!submenu) return;

    const summary = this.mainDetailsToggle.querySelector('summary');
    summary.setAttribute('aria-expanded', true);

    // 如果已经打开，只确保动画状态正确
    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.ensureOpenAnimState(submenu);
      return;
    }

    // 先设置 open 属性（这样可以获取真实高度）
    this.mainDetailsToggle.setAttribute('open', '');

    // 触发高度展开动画
    this.animateHeight(submenu, true);
  }

  closeWithAnimation() {
    const submenu = this.content;
    if (!submenu || !this.mainDetailsToggle.hasAttribute('open')) return;

    // 执行收缩动画
    this.animateHeight(submenu, false, () => {
      this.close();
    });
  }

  close() {
    // 覆盖父类方法：除了移除 open 属性，还要清理 is-open 类和行内样式
    super.close();
    const submenu = this.content;
    if (submenu) {
      // 作废正在进行的动画回调（必须在清理样式之前，防止回调执行）
      submenu._animToken = 0;
      submenu.classList.remove('is-open');
      submenu.style.visibility = 'hidden';
      submenu.style.opacity = '';
      submenu.style.pointerEvents = '';
      submenu.style.maxHeight = '';
      submenu.style.paddingTop = '';
      submenu.style.paddingBottom = '';
      submenu.style.borderTopWidth = '';
      submenu.style.transform = '';
      submenu.style.overflow = '';
      submenu.style.transition = '';
    }
    // 清除可能挂起的关闭定时器
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  ensureOpenAnimState(submenu) {
    // 作废正在进行的动画回调（防止中断动画后的 stale 回调再次执行）
    submenu._animToken = (submenu._animToken || 0) + 1;
    // 移除可能残留的旧 transitionend 监听器
    if (submenu._onTransEnd) {
      submenu.removeEventListener('transitionend', submenu._onTransEnd);
      submenu._onTransEnd = null;
    }

    // 确保处于展开终止态：清除所有行内动画样式，让 CSS 类 (.is-open) 接管
    submenu.classList.add('is-open');
    submenu.style.maxHeight = '';
    submenu.style.paddingTop = '';
    submenu.style.paddingBottom = '';
    submenu.style.borderTopWidth = '';
    submenu.style.opacity = '';
    submenu.style.visibility = '';
    submenu.style.transform = '';
    submenu.style.overflow = '';
    submenu.style.transition = '';
  }

  animateHeight(submenu, expanding, onComplete) {
    // —— 动画 token 机制 ——
    // 每次 animateHeight 生成一个唯一 token，回调执行前校验 token 是否匹配，
    // 这样被中断的旧动画回调（transitionend / setTimeout）不会错误执行
    const token = (submenu._animToken || 0) + 1;
    submenu._animToken = token;

    // 清理上一次残留的 transitionend 监听器，防止累积
    if (submenu._onTransEnd) {
      submenu.removeEventListener('transitionend', submenu._onTransEnd);
    }

    // —— 起始样式（为动画设置起点）——
    if (expanding) {
      // 展开起点：零高度 + 零垂直 padding + 零 border
      submenu.style.maxHeight = '0px';
      submenu.style.paddingTop = '0';
      submenu.style.paddingBottom = '0';
      submenu.style.borderTopWidth = '0';
      submenu.style.opacity = '0';
      submenu.style.visibility = 'visible';
      submenu.style.overflow = 'hidden';
      submenu.classList.add('is-open');
    } else {
      // 收起起点：固定当前可见高度
      const currentRect = submenu.getBoundingClientRect();
      submenu.style.maxHeight = `${currentRect.height}px`;
      submenu.style.visibility = 'visible';
      submenu.style.opacity = '1';
      submenu.style.pointerEvents = 'auto';
      submenu.style.overflow = 'hidden';
    }

    requestAnimationFrame(() => {
      if (submenu._animToken !== token) return;

      requestAnimationFrame(() => {
        if (submenu._animToken !== token) return;

        let targetHeight;
        if (expanding) {
          // —— 测量目标高度：临时移除 max-height 约束，应用目标 padding/border ——
          // 用 opacity:0 保持不可见，用户看不到测量过程
          submenu.style.transition = 'none';
          submenu.style.maxHeight = 'none';
          submenu.style.paddingTop = '3rem';
          submenu.style.paddingBottom = '3rem';
          submenu.style.borderTopWidth = '1px';
          submenu.style.opacity = '0';
          // 强制浏览器完成布局
          void submenu.offsetHeight;
          // getBoundingClientRect().height 包含 content + padding + border，最精准
          const naturalHeight = submenu.getBoundingClientRect().height;
          // 对齐 CSS .is-open max-height：防止动画结束清除行内样式时产生跳变
          targetHeight = Math.min(naturalHeight, this.MAX_EXPAND_HEIGHT);

          // —— 回退到动画起点 ——
          submenu.style.maxHeight = '0px';
          submenu.style.paddingTop = '0';
          submenu.style.paddingBottom = '0';
          submenu.style.borderTopWidth = '0';
          // 强制起点生效
          void submenu.offsetHeight;
        } else {
          targetHeight = 0;
        }

        // —— 开启过渡并过渡到终点 ——
        submenu.style.transition = `max-height ${this.ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1),
                                   padding-top ${this.ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1),
                                   padding-bottom ${this.ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1),
                                   border-top-width ${this.ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1),
                                   opacity ${this.ANIMATION_DURATION}ms ease,
                                   transform ${this.ANIMATION_DURATION}ms ease`;

        if (expanding) {
          submenu.style.maxHeight = `${targetHeight}px`;
          submenu.style.paddingTop = '3rem';
          submenu.style.paddingBottom = '3rem';
          submenu.style.borderTopWidth = '1px';
          submenu.style.opacity = '1';
          submenu.style.transform = 'translateY(0)';
        } else {
          submenu.style.maxHeight = '0px';
          submenu.style.paddingTop = '0';
          submenu.style.paddingBottom = '0';
          submenu.style.borderTopWidth = '0';
          submenu.style.opacity = '0';
          submenu.style.transform = 'translateY(-10px)';
        }
      });
    });

    // 动画结束清理（token 校验后才执行）
    const handleEnd = () => {
      if (submenu._animToken !== token) return;

      submenu.style.transition = '';
      submenu.style.overflow = '';
      if (expanding) {
        // 展开完成：清掉行内样式，让 CSS 类 (.is-open) 接管
        submenu.style.maxHeight = '';
        submenu.style.paddingTop = '';
        submenu.style.paddingBottom = '';
        submenu.style.borderTopWidth = '';
        submenu.style.opacity = '';
        submenu.style.visibility = '';
        submenu.style.transform = '';
      } else {
        // 收起完成：移除 is-open 类，CSS 闭合态接管
        submenu.classList.remove('is-open');
        submenu.style.visibility = 'hidden';
        submenu.style.opacity = '';
        submenu.style.pointerEvents = '';
        submenu.style.maxHeight = '';
        submenu.style.paddingTop = '';
        submenu.style.paddingBottom = '';
        submenu.style.borderTopWidth = '';
        submenu.style.transform = '';
      }
      if (submenu._onTransEnd === onTransEnd) submenu._onTransEnd = null;
      if (onComplete) onComplete();
    };

    // 监听 max-height transition 结束
    let done = false;
    const onTransEnd = (e) => {
      if (e.propertyName === 'max-height' && !done && submenu._animToken === token) {
        done = true;
        submenu.removeEventListener('transitionend', onTransEnd);
        if (submenu._onTransEnd === onTransEnd) submenu._onTransEnd = null;
        handleEnd();
      }
    };
    submenu._onTransEnd = onTransEnd;
    submenu.addEventListener('transitionend', onTransEnd);

    // 兜底：时间到强制结束
    setTimeout(() => {
      if (!done && submenu._animToken === token) {
        done = true;
        submenu.removeEventListener('transitionend', onTransEnd);
        if (submenu._onTransEnd === onTransEnd) submenu._onTransEnd = null;
        handleEnd();
      }
    }, this.ANIMATION_DURATION + 60);
  }

  // 切换到移动端时清理桌面端残留状态
  _cleanupDesktopState() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    const submenu = this.content;
    if (submenu) {
      // 作废动画回调
      submenu._animToken = (submenu._animToken || 0) + 1;
      if (submenu._onTransEnd) {
        submenu.removeEventListener('transitionend', submenu._onTransEnd);
        submenu._onTransEnd = null;
      }
      // 清理桌面端行内样式，恢复原生 details 行为
      submenu.classList.remove('is-open');
      submenu.style.cssText = '';
    }
    // 关闭打开的 details（移动端用原生 drawer 管理）
    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.mainDetailsToggle.removeAttribute('open');
    }
  }

  disconnectedCallback() {
    // 元素从 DOM 移除时清理监听器和定时器
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this._isDesktop.removeEventListener('change', this._breakpointHandler);
    const submenu = this.content;
    if (submenu && submenu._onTransEnd) {
      submenu.removeEventListener('transitionend', submenu._onTransEnd);
      submenu._onTransEnd = null;
    }
  }

  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }
}

customElements.define('header-menu', HeaderMenu);
