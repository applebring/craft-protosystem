if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();
      }

      hide() {
        // 重写子类hide方法，隐藏模态框时，清空模态框内容
        const closeButton = this.querySelector('[id^="ModalClose-"]');
        if (closeButton) {
          closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            super.hide();
          });
        }
      }

      show(opener) {
        super.show(opener);
        this.showActiveMedia();
      }

      showActiveMedia() {
        const activeMediaId = this.openedBy?.getAttribute('data-media-id');
        if (!activeMediaId) return;

        this.querySelectorAll(
          `[data-media-id]:not([data-media-id="${activeMediaId}"])`
        ).forEach((element) => {
          element.classList.remove('active');
        });

        const activeMedia = this.querySelector(`[data-media-id="${activeMediaId}"]`);
        if (!activeMedia) return;

        const activeMediaTemplate = activeMedia.querySelector('template');
        const activeMediaContent = activeMediaTemplate ? activeMediaTemplate.content : null;
        activeMedia.classList.add('active');

        const swiperElement = this.querySelector('.swiper');
        const swiper = swiperElement?.swiper;
        if (swiper) {
          const slides = Array.from(this.querySelectorAll('.swiper-slide'));
          const slideIndex = slides.findIndex((slide) => slide.dataset.mediaId === activeMediaId);
          if (slideIndex >= 0) {
            swiper.slideTo(slideIndex, 0);
          }
        } else {
          activeMedia.scrollIntoView();
          const container = this.querySelector('[role="document"]');
          if (container) {
            container.scrollLeft = (activeMedia.offsetWidth - container.clientWidth) / 2;
          }
        }

        if (
          activeMedia.nodeName == 'DEFERRED-MEDIA' &&
          activeMediaContent &&
          activeMediaContent.querySelector('.js-youtube')
        )
          activeMedia.loadContent();
      }
    }
  );
}
