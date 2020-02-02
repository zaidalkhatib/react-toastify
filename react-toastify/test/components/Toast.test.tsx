import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { Toast, ToastContainer } from '../../src/components';
import { RT_NAMESPACE } from '../../src/utils';
import { WithInjectedOptions } from 'types';
import { act } from 'react-dom/test-utils';

const REQUIRED_PROPS = {
  ...ToastContainer.defaultProps,
  in: true,
  closeToast: () => {},
  type: 'default',
  toastId: 'id',
  key: 'key'
} as WithInjectedOptions;

const cssClasses = {
  rtl: `.${RT_NAMESPACE}__toast--rtl`,
  progressBar: `.${RT_NAMESPACE}__progress-bar`,
  closeButton: `.${RT_NAMESPACE}__close-button`
};

function getProgressBar(container: HTMLElement) {
  const progressBar = container.querySelector(
    cssClasses.progressBar
  ) as HTMLElement;
  return {
    isRunning: () =>
      expect(progressBar.style.animationPlayState).toBe('running'),
    isPaused: () => expect(progressBar.style.animationPlayState).toBe('paused'),
    isControlled: (progress: number) => {
      expect(
        container.querySelector(`.${RT_NAMESPACE}__progress-bar--controlled`)
      ).not.toBe(null);
      expect(progressBar.style.transform).toMatch(`scaleX(${progress})`);
    }
  };
}

describe('Toast Component', () => {
  it('Should merge container and body className', () => {
    const { container } = render(
      <Toast
        {...REQUIRED_PROPS}
        autoClose={false}
        className="container-class"
        bodyClassName="body-class"
      >
        FooBar
      </Toast>
    );
    expect(container.querySelector('.container-class')).not.toBe(null);
    expect(container.querySelector('.body-class')).not.toBe(null);
  });

  it('Should support Rtl display', () => {
    const { container } = render(
      <Toast {...REQUIRED_PROPS} autoClose={false} rtl>
        FooBar
      </Toast>
    );

    expect(container.querySelector(cssClasses.rtl)).not.toBeNull();
  });

  it('Should not render ProgressBar if autoClose prop is set to false', () => {
    const { container } = render(
      <Toast {...REQUIRED_PROPS} autoClose={false}>
        FooBar
      </Toast>
    );

    expect(container.querySelector(cssClasses.progressBar)).toBe(null);
  });

  it('Should not render closeButton if closeButton prop is set to false', () => {
    const { container } = render(
      <Toast {...REQUIRED_PROPS} closeButton={false}>
        FooBar
      </Toast>
    );

    expect(container.querySelector(cssClasses.closeButton)).toBe(null);
  });

  it.skip('Can call onOpen callback when component mount', () => {
    const onOpen = jest.fn();
    render(
      <Toast {...REQUIRED_PROPS} onOpen={onOpen}>
        FooBar
      </Toast>
    );

    expect(onOpen).toHaveBeenCalled();
  });

  it.skip('Can call onClose callback when component will unmount', () => {
    const onClose = jest.fn();
    const { unmount } = render(
      <Toast {...REQUIRED_PROPS} onClose={onClose}>
        FooBar
      </Toast>
    );
    unmount();
    expect(onClose).toHaveBeenCalled();
  });

  it('Can pause toast delay on mouse enter', () => {
    const { container } = render(<Toast {...REQUIRED_PROPS}>FooBar</Toast>);
    const progressBar = getProgressBar(container);

    progressBar.isRunning();
    fireEvent.mouseEnter(container.firstChild as HTMLElement);
    progressBar.isPaused();
  });

  it('Can keep runing on mouse enter', () => {
    const { container } = render(
      <Toast {...REQUIRED_PROPS} pauseOnHover={false}>
        FooBar
      </Toast>
    );
    const progressBar = getProgressBar(container);

    progressBar.isRunning();
    fireEvent.mouseEnter(container.firstChild as HTMLElement);
    progressBar.isRunning();
  });

  it('Should resume toast delay on mouse leave', () => {
    const { container } = render(<Toast {...REQUIRED_PROPS}>FooBar</Toast>);
    const progressBar = getProgressBar(container);

    progressBar.isRunning();
    fireEvent.mouseEnter(container.firstChild as HTMLElement);
    progressBar.isPaused();
    fireEvent.mouseLeave(container.firstChild as HTMLElement);
    progressBar.isRunning();
  });

  it('Should pause Toast on window blur and resume Toast on focus', () => {
    const { container } = render(<Toast {...REQUIRED_PROPS}>FooBar</Toast>);
    const progressBar = getProgressBar(container);

    progressBar.isRunning();

    let ev = new Event('blur');
    act(() => {
      window.dispatchEvent(ev);
    });

    progressBar.isPaused();

    ev = new Event('focus');
    act(() => {
      window.dispatchEvent(ev);
    });

    progressBar.isRunning();
  });

  it('Should bind or unbind dom events when `pauseOnFocusLoss` and `draggable` props are updated', () => {
    const { rerender } = render(<Toast {...REQUIRED_PROPS}>FooBar</Toast>);

    document.removeEventListener = jest.fn();
    window.removeEventListener = jest.fn();

    rerender(
      <Toast {...REQUIRED_PROPS} draggable={false} pauseOnFocusLoss={false}>
        FooBar
      </Toast>
    );

    expect(document.removeEventListener).toHaveBeenCalled();
    expect(window.removeEventListener).toHaveBeenCalled();

    document.addEventListener = jest.fn();
    window.addEventListener = jest.fn();

    rerender(
      <Toast {...REQUIRED_PROPS} draggable={true} pauseOnFocusLoss={true}>
        FooBar
      </Toast>
    );

    expect(document.removeEventListener).toHaveBeenCalled();
    expect(window.removeEventListener).toHaveBeenCalled();
  });

  it('Should render toast with controlled progress bar', () => {
    const { container } = render(
      <Toast {...REQUIRED_PROPS} progress={0.3}>
        FooBar
      </Toast>
    );
    const progressBar = getProgressBar(container);
    progressBar.isControlled(0.3);
  });

  it('Should render toast with controlled progress bar even if autoClose is false', () => {
    const { container } = render(
      <Toast {...REQUIRED_PROPS} progress={0.3} autoClose={false}>
        FooBar
      </Toast>
    );
    const progressBar = getProgressBar(container);
    progressBar.isControlled(0.3);
  });

  it('Should close the toast when progressBar animation end', () => {
    const closeToast = jest.fn();
    const { container } = render(
      <Toast {...REQUIRED_PROPS} closeToast={closeToast}>
        FooBar
      </Toast>
    );

    fireEvent.animationEnd(
      container.querySelector(`.${RT_NAMESPACE}__progress-bar`) as HTMLElement
    );

    expect(closeToast).toHaveBeenCalled();
  });

  it.skip('Should close the toast if progress value is >= 1 when the progress bar is controlled', () => {
    const closeToast = jest.fn();
    const { container } = render(
      <Toast {...REQUIRED_PROPS} closeToast={closeToast} progress={1}>
        FooBar
      </Toast>
    );
    const progressBar = getProgressBar(container);
    progressBar.isControlled(1);

    fireEvent.transitionEnd(
      container.querySelector(`.${RT_NAMESPACE}__progress-bar`) as HTMLElement
    );

    expect(closeToast).toHaveBeenCalled();
  });

  it('Should add the role attribute to the toast body', () => {
    const { container } = render(
      <Toast {...REQUIRED_PROPS} role="status">
        FooBar
      </Toast>
    );
    expect(container.querySelector('[role="status"]')).not.toBe(null);
  });
});