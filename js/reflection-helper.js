
/* -----------------------------------------------------------------------
   ReflectionHelper class:
   This class inspects a custom element's class and instance to extract
   attributes (using observedAttributes), methods, and properties. It
   excludes any keys that start with "_" and any keys inherited from
   HTMLElement.prototype. It also provides a helper to access dojoMeta.
------------------------------------------------------------------------- */
export class ReflectionHelper {
    constructor(ComponentClass, instance, stopAt = HTMLElement) {
      this.ComponentClass = ComponentClass;
      this.instance = instance;
      this.stopAt = stopAt;
      // Get a set of all properties from HTMLElement.prototype.
      this.baseProps = new Set(Object.getOwnPropertyNames(stopAt.prototype));
      this.methods = [];
      this.properties = [];
      this.collect();
    }
  
    collect() {
      let proto = this.ComponentClass.prototype;
      // Walk the prototype chain until we reach the stopAt prototype.
      while (proto && proto !== this.stopAt.prototype) {
        const ownProps = Object.getOwnPropertyNames(proto)
          .filter(name => name !== 'constructor' && !name.startsWith('_') && !this.baseProps.has(name));
        ownProps.forEach(prop => {
          const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
          if (typeof descriptor.value === 'function') {
            // Extract the parameter names.
            const funcString = descriptor.value.toString();
            const paramsStart = funcString.indexOf('(') + 1;
            const paramsEnd = funcString.indexOf(')');
            const paramsString = funcString.slice(paramsStart, paramsEnd);
            const params = paramsString.split(',')
              .map(param => param.trim())
              .filter(Boolean);
            this.methods.push({
              name: prop,
              params,
              type: descriptor.value.constructor.name,
              call: (...args) => this.instance[prop](...args)
            });
          } else {
            // For non-function properties, provide getters and setters.
            this.properties.push({
              name: prop,
              type: typeof descriptor.value,
              get: () => this.instance[prop],
              set: (val) => { this.instance[prop] = val; }
            });
          }
        });
        proto = Object.getPrototypeOf(proto);
      }
    }
  
    /**
     * Retrieves the list of observed attributes (from ComponentClass.observedAttributes)
     * that do not start with an underscore.
     *
     * @returns {Array} Array of attribute objects with get and set methods.
     */
    getAttributes() {
      const observed = this.ComponentClass.observedAttributes || [];
      const attributes = [];
      observed.forEach(attr => {
        if (!attr.startsWith('_')) {
          attributes.push({
            name: attr,
            get: () => this.instance.getAttribute(attr),
            set: (val) => { this.instance.setAttribute(attr, val); }
          });
        }
      });
      return attributes;
    }
  
    /**
     * Returns the dojoMeta interface if provided by the component.
     *
     * @returns {Object|null} The dojoMeta object or null.
     */
    getDojoMeta() {
      return this.ComponentClass.dojoMeta || null;
    }
  }