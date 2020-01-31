// import React from 'react';
// import { render } from 'react-dom';

import { POSITION, TYPE, eventManager, canUseDom, isStr, isNum } from '../utils';
import { ToastContent, ToastOptions, WithInjectedOptions, ToastId, TypeOptions, ContainerId } from '../types';
//import { ToastContainer } from '.';


interface Toast {
  /**
   * Shorthand to display toast of type 'success'.
   */
  success(content: ToastContent, options?: ToastOptions): ToastId;

  /**
   * Shorthand to display toast of type 'info'.
   */
  info(content: ToastContent, options?: ToastOptions): ToastId;

  /**
   * Shorthand to display toast of type 'warning'.
   */
  warn(content: ToastContent, options?: ToastOptions): ToastId;

  /**
   * Shorthand to display toast of type 'error'.
   */
  error(content: ToastContent, options?: ToastOptions): ToastId;

  /**
   * Check if a toast is active by passing the `toastId`.
   * Each time you display a toast you receive a `toastId`.
   */
  isActive(toastId: ToastId): boolean;

  /**
   * Remove a toast. If no `toastId` is used, all the active toast
   * will be removed.
   */
  dismiss(toastId?: ToastId): void;

  /**
   * Update an existing toast. By default, we keep the initial content and options of the toast.
   */
  update(toastId: ToastId, options?: UpdateOptions): void;

  /**
   * Listen for change when a toast is added or removed. The number of toast displayed is passed as paran to the callback
   */
  onChange(
    callback: (count?: number, containerId?: string | number) => void
  ): void;

  /**
   * Set a controlled progress bar value to 100% then close the toast
   */
  done(toastId: ToastId): void;

  /**
   * Let you define `ToastContainer` props when lazy mounted.
   * When called enable lazy mounted container
   */
  configure(config?: ToastContainerProps): void;

  /**
   * Display a toast without a specific type.
   */
  (content: ToastContent, options?: ToastOptions): ToastId;

  /**
   * Helper to set notification type
   */
  TYPE: typeof TYPE;

  /**
   * Helper to set position
   */
  POSITION: typeof POSITION;
}




let containers = new Map();
let latestInstance = null;
let containerDomNode = null;
let containerConfig = {};
let queue = [];
let lazy = false;

/**
 * Check whether any container is currently mounted in the DOM
 */
function isAnyContainerMounted() {
  return containers.size > 0;
}

/**
 * Get the container by id. Returns the last container declared when no id is given.
 */
function getContainer(containerId?: ContainerId) {
  if (!isAnyContainerMounted()) return null;

  if (!containerId) return containers.get(latestInstance);

  return containers.get(containerId);
}

/**
 * Get the toast by id, given it's in the DOM, otherwise returns null
 */
function getToast(toastId: ToastId, { containerId }: ToastOptions ) {
  const container = getContainer(containerId);
  if (!container) return null;

  const toast = container.collection[toastId];
  if (typeof toast === 'undefined') return null;

  return toast;
}

/**
 * Merge provided options with the defaults settings and generate the toastId
 */
function mergeOptions(options: ToastOptions, type: TypeOptions) {
  return { ...options, type, toastId: getToastId(options) };
}

/**
 * Generate a random toastId
 */
function generateToastId() {
  return (Math.random().toString(36) + Date.now().toString(36)).substr(2, 10);
}

/**
 * Generate a toastId or use the one provided
 */
function getToastId(options: ToastOptions) {
  if (
    options &&
    (typeof options.toastId === 'string' ||
      (typeof options.toastId === 'number' && !isNaN(options.toastId)))
  ) {
    return options.toastId;
  }

  return generateToastId();
}

/**
 * If the container is not mounted, the toast is enqueued and
 * the container lazy mounted
 */
function dispatchToast(content: ToastContent, options: WithInjectedOptions): ToastId {
  if (isAnyContainerMounted()) {
    eventManager.emit("show", content, options);
  } else {
    queue.push({ action: "show", content, options });
    if (lazy && canUseDom) {
      lazy = false;
      containerDomNode = document.createElement('div');
      document.body.appendChild(containerDomNode);
   //   render(<ToastContainer {...containerConfig} />, containerDomNode);
    }
  }

  return options.toastId;
}

const toast = (content: ToastContent, options: ToastOptions) =>
  dispatchToast(
    content,
    mergeOptions(options, (options && options.type) || TYPE.DEFAULT)
  );

/**
 * For each available type create a shortcut
 */
for (const t in TYPE) {
  if (TYPE[t] !== TYPE.DEFAULT) {
    toast[TYPE[t].toLowerCase()] = (content, options) =>
      dispatchToast(
        content,
        mergeOptions(options, (options && options.type) || TYPE[t])
      );
  }
}

/**
 * Maybe I should remove warning in favor of warn, I don't know
 */
toast.warn = toast.warning;

/**
 * Remove toast programmaticaly
 */
toast.dismiss = (id?: ToastId) =>
  isAnyContainerMounted() && eventManager.emit('clear', id)

/**
 * return true if one container is displaying the toast
 */
toast.isActive = (id: ToastId) => {
  let isToastActive = false;

  if (containers.size > 0) {
    containers.forEach(container => {
      console.log(containers);
      
      if (container.isToastActive(id)) {
        isToastActive = true;
      }
    });
  }

  return isToastActive;
};

toast.update = (toastId: ToastId, options: ToastOptions = {}) => {
  // if you call toast and toast.update directly nothing will be displayed
  // this is why I defered the update
  setTimeout(() => {
    const toast = getToast(toastId, options);
    if (toast) {
      const { options: oldOptions, content: oldContent } = toast;

      const nextOptions = {
        ...oldOptions,
        ...options,
        toastId: options.toastId || toastId
      };

      if (!options.toastId || options.toastId === toastId) {
        nextOptions.updateId = generateToastId();
      } else {
        nextOptions.staleToastId = toastId;
      }

      const content =
        typeof nextOptions.render !== 'undefined'
          ? nextOptions.render
          : oldContent;
      delete nextOptions.render;
      dispatchToast(content, nextOptions);
    }
  }, 0);
};

/**
 * Used for controlled progress bar.
 */
toast.done = id => {
  toast.update(id, {
    progress: 1
  });
};

/**
 * Track changes. The callback get the number of toast displayed
 */
toast.onChange = (callback) => {
  if (typeof callback === 'function') {
    eventManager.on("change", callback);
  }
};

/**
 * Configure the ToastContainer when lazy mounted
 */
toast.configure = config => {
  lazy = true;
  containerConfig = config;
};

toast.POSITION = POSITION;
toast.TYPE = TYPE;

/**
 * Wait until the ToastContainer is mounted to dispatch the toast
 * and attach isActive method
 */
eventManager
  .on(ACTION.DID_MOUNT, containerInstance => {
    latestInstance = containerInstance.containerId || containerInstance;
    containers.set(latestInstance, containerInstance);

    queue.forEach(item => {
      eventManager.emit(item.action, item.content, item.options);
    });

    queue = [];
  })
  .on(ACTION.WILL_UNMOUNT, containerInstance => {
    if (containerInstance)
      containers.delete(
        containerInstance.containerId || containerInstance
      );
    else containers.clear();

    if (containers.size === 0) {
      eventManager.off(ACTION.SHOW).off(ACTION.CLEAR);
    }

    if (canUseDom && containerDomNode) {
      document.body.removeChild(containerDomNode);
    }
  });

export default toast;