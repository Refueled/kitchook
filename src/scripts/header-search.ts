const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileHeader = window.matchMedia('(max-width: 48rem)');

for (const disclosure of document.querySelectorAll<HTMLDetailsElement>('[data-header-search]')) {
  const input = disclosure.querySelector<HTMLInputElement>('input[type="search"]');
  const summary = disclosure.querySelector<HTMLElement>('summary');
  const header = disclosure.closest<HTMLElement>('.site-header__inner--search');
  let heightAnimation: Animation | undefined;
  let toggleSequence = 0;

  const setOpen = async (open: boolean): Promise<void> => {
    const sequence = ++toggleSequence;
    const startHeight = header?.getBoundingClientRect().height;

    heightAnimation?.cancel();
    heightAnimation = undefined;
    disclosure.open = open;

    if (
      header &&
      startHeight !== undefined &&
      mobileHeader.matches &&
      !reduceMotion.matches
    ) {
      const endHeight = header.getBoundingClientRect().height;

      if (Math.abs(endHeight - startHeight) > 1) {
        header.style.overflow = 'clip';
        const animation = header.animate(
          [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
          { duration: 180, easing: 'ease-out', fill: 'both' },
        );
        heightAnimation = animation;
        await animation.finished.catch(() => undefined);

        if (heightAnimation === animation) {
          animation.cancel();
          header.style.removeProperty('overflow');
          heightAnimation = undefined;
        }
      }
    }

    if (sequence !== toggleSequence) return;
    if (open) input?.focus();
  };

  summary?.addEventListener('click', (event) => {
    event.preventDefault();
    void setOpen(!disclosure.open);
  });

  input?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    void setOpen(false);
    summary?.focus();
  });
}
