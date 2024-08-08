var mr = Object.defineProperty;
var gr = (t, e, n) => e in t ? mr(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[e] = n;
var D = (t, e, n) => gr(t, typeof e != "symbol" ? e + "" : e, n);
const br = Math.random, vr = function t(e) {
  function n(r, s) {
    return r = r == null ? 0 : +r, s = s == null ? 1 : +s, arguments.length === 1 ? (s = r, r = 0) : s -= r, function() {
      return e() * s + r;
    };
  }
  return n.source = t, n;
}(br), wr = 1664525, _r = 1013904223, _n = 1 / 4294967296;
function xr(t = Math.random()) {
  let e = (0 <= t && t < 1 ? t / _n : Math.abs(t)) | 0;
  return () => (e = wr * e + _r | 0, _n * (e >>> 0));
}
var cn = {};
/**
 * @license MIT
 * @copyright 2020 Eyas Ranjous <eyas.ranjous@gmail.com>
 *
 * @class
 */
let kr = class nt {
  /**
   * @param {function} compare
   * @param {array} [_values]
   * @param {number|string|object} [_leaf]
   */
  constructor(e, n, r) {
    if (typeof e != "function")
      throw new Error("Heap constructor expects a compare function");
    this._compare = e, this._nodes = Array.isArray(n) ? n : [], this._leaf = r || null;
  }
  /**
   * Converts the heap to a cloned array without sorting.
   * @public
   * @returns {Array}
   */
  toArray() {
    return Array.from(this._nodes);
  }
  /**
   * Checks if a parent has a left child
   * @private
   */
  _hasLeftChild(e) {
    return e * 2 + 1 < this.size();
  }
  /**
   * Checks if a parent has a right child
   * @private
   */
  _hasRightChild(e) {
    return e * 2 + 2 < this.size();
  }
  /**
   * Compares two nodes
   * @private
   */
  _compareAt(e, n) {
    return this._compare(this._nodes[e], this._nodes[n]);
  }
  /**
   * Swaps two nodes in the heap
   * @private
   */
  _swap(e, n) {
    const r = this._nodes[e];
    this._nodes[e] = this._nodes[n], this._nodes[n] = r;
  }
  /**
   * Checks if parent and child should be swapped
   * @private
   */
  _shouldSwap(e, n) {
    return e < 0 || e >= this.size() || n < 0 || n >= this.size() ? !1 : this._compareAt(e, n) > 0;
  }
  /**
   * Compares children of a parent
   * @private
   */
  _compareChildrenOf(e) {
    if (!this._hasLeftChild(e) && !this._hasRightChild(e))
      return -1;
    const n = e * 2 + 1, r = e * 2 + 2;
    return this._hasLeftChild(e) ? this._hasRightChild(e) && this._compareAt(n, r) > 0 ? r : n : r;
  }
  /**
   * Compares two children before a position
   * @private
   */
  _compareChildrenBefore(e, n, r) {
    return this._compareAt(r, n) <= 0 && r < e ? r : n;
  }
  /**
   * Recursively bubbles up a node if it's in a wrong position
   * @private
   */
  _heapifyUp(e) {
    let n = e, r = Math.floor((n - 1) / 2);
    for (; this._shouldSwap(r, n); )
      this._swap(r, n), n = r, r = Math.floor((n - 1) / 2);
  }
  /**
   * Recursively bubbles down a node if it's in a wrong position
   * @private
   */
  _heapifyDown(e) {
    let n = e, r = this._compareChildrenOf(n);
    for (; this._shouldSwap(n, r); )
      this._swap(n, r), n = r, r = this._compareChildrenOf(n);
  }
  /**
   * Recursively bubbles down a node before a given index
   * @private
   */
  _heapifyDownUntil(e) {
    let n = 0, r = 1, s = 2, i;
    for (; r < e; )
      i = this._compareChildrenBefore(
        e,
        r,
        s
      ), this._shouldSwap(n, i) && this._swap(n, i), n = i, r = n * 2 + 1, s = n * 2 + 2;
  }
  /**
   * Inserts a new value into the heap
   * @public
   * @param {number|string|object} value
   * @returns {Heap}
   */
  insert(e) {
    return this._nodes.push(e), this._heapifyUp(this.size() - 1), (this._leaf === null || this._compare(e, this._leaf) > 0) && (this._leaf = e), this;
  }
  /**
   * Inserts a new value into the heap
   * @public
   * @param {number|string|object} value
   * @returns {Heap}
   */
  push(e) {
    return this.insert(e);
  }
  /**
   * Removes and returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  extractRoot() {
    if (this.isEmpty())
      return null;
    const e = this.root();
    return this._nodes[0] = this._nodes[this.size() - 1], this._nodes.pop(), this._heapifyDown(0), e === this._leaf && (this._leaf = this.root()), e;
  }
  /**
   * Removes and returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  pop() {
    return this.extractRoot();
  }
  /**
   * Applies heap sort and return the values sorted by priority
   * @public
   * @returns {array}
   */
  sort() {
    for (let e = this.size() - 1; e > 0; e -= 1)
      this._swap(0, e), this._heapifyDownUntil(e);
    return this._nodes;
  }
  /**
   * Fixes node positions in the heap
   * @public
   * @returns {Heap}
   */
  fix() {
    for (let e = Math.floor(this.size() / 2) - 1; e >= 0; e -= 1)
      this._heapifyDown(e);
    for (let e = Math.floor(this.size() / 2); e < this.size(); e += 1) {
      const n = this._nodes[e];
      (this._leaf === null || this._compare(n, this._leaf) > 0) && (this._leaf = n);
    }
    return this;
  }
  /**
   * Verifies that all heap nodes are in the right position
   * @public
   * @returns {boolean}
   */
  isValid() {
    const e = (n) => {
      let r = !0, s = !0;
      if (this._hasLeftChild(n)) {
        const i = n * 2 + 1;
        if (this._compareAt(n, i) > 0)
          return !1;
        r = e(i);
      }
      if (this._hasRightChild(n)) {
        const i = n * 2 + 2;
        if (this._compareAt(n, i) > 0)
          return !1;
        s = e(i);
      }
      return r && s;
    };
    return e(0);
  }
  /**
   * Returns a shallow copy of the heap
   * @public
   * @returns {Heap}
   */
  clone() {
    return new nt(this._compare, this._nodes.slice(), this._leaf);
  }
  /**
   * Returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  root() {
    return this.isEmpty() ? null : this._nodes[0];
  }
  /**
   * Returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  top() {
    return this.root();
  }
  /**
   * Returns a leaf node in the heap
   * @public
   * @returns {number|string|object}
   */
  leaf() {
    return this._leaf;
  }
  /**
   * Returns the number of nodes in the heap
   * @public
   * @returns {number}
   */
  size() {
    return this._nodes.length;
  }
  /**
   * Checks if the heap is empty
   * @public
   * @returns {boolean}
   */
  isEmpty() {
    return this.size() === 0;
  }
  /**
   * Clears the heap
   * @public
   */
  clear() {
    this._nodes = [], this._leaf = null;
  }
  /**
   * Implements an iterable on the heap
   * @public
   */
  [Symbol.iterator]() {
    let e = this.size();
    return {
      next: () => (e -= 1, {
        value: this.pop(),
        done: e === -1
      })
    };
  }
  /**
   * Builds a heap from a array of values
   * @public
   * @static
   * @param {array} values
   * @param {function} compare
   * @returns {Heap}
   */
  static heapify(e, n) {
    if (!Array.isArray(e))
      throw new Error("Heap.heapify expects an array of values");
    if (typeof n != "function")
      throw new Error("Heap.heapify expects a compare function");
    return new nt(n, e).fix();
  }
  /**
   * Checks if a list of values is a valid heap
   * @public
   * @static
   * @param {array} values
   * @param {function} compare
   * @returns {boolean}
   */
  static isHeapified(e, n) {
    return new nt(n, e).isValid();
  }
};
cn.Heap = kr;
var Rn = {};
/**
 * @license MIT
 * @copyright 2020 Eyas Ranjous <eyas.ranjous@gmail.com>
 */
const { Heap: Pt } = cn, Ct = (t) => (e, n) => {
  const r = typeof t == "function" ? t(e) : e, s = typeof t == "function" ? t(n) : n;
  return r <= s ? -1 : 1;
};
let Pr = class rt {
  /**
   * @param {function} [getCompareValue]
   * @param {Heap} [_heap]
   */
  constructor(e, n) {
    this._getCompareValue = e, this._heap = n || new Pt(Ct(e));
  }
  /**
   * Converts the heap to a cloned array without sorting.
   * @public
   * @returns {Array}
   */
  toArray() {
    return Array.from(this._heap._nodes);
  }
  /**
   * Inserts a new value into the heap
   * @public
   * @param {number|string|object} value
   * @returns {MinHeap}
   */
  insert(e) {
    return this._heap.insert(e);
  }
  /**
   * Inserts a new value into the heap
   * @public
   * @param {number|string|object} value
   * @returns {Heap}
   */
  push(e) {
    return this.insert(e);
  }
  /**
   * Removes and returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  extractRoot() {
    return this._heap.extractRoot();
  }
  /**
   * Removes and returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  pop() {
    return this.extractRoot();
  }
  /**
   * Applies heap sort and return the values sorted by priority
   * @public
   * @returns {array}
   */
  sort() {
    return this._heap.sort();
  }
  /**
   * Fixes node positions in the heap
   * @public
   * @returns {MinHeap}
   */
  fix() {
    return this._heap.fix();
  }
  /**
   * Verifies that all heap nodes are in the right position
   * @public
   * @returns {boolean}
   */
  isValid() {
    return this._heap.isValid();
  }
  /**
   * Returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  root() {
    return this._heap.root();
  }
  /**
   * Returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  top() {
    return this.root();
  }
  /**
   * Returns a leaf node in the heap
   * @public
   * @returns {number|string|object}
   */
  leaf() {
    return this._heap.leaf();
  }
  /**
   * Returns the number of nodes in the heap
   * @public
   * @returns {number}
   */
  size() {
    return this._heap.size();
  }
  /**
   * Checks if the heap is empty
   * @public
   * @returns {boolean}
   */
  isEmpty() {
    return this._heap.isEmpty();
  }
  /**
   * Clears the heap
   * @public
   */
  clear() {
    this._heap.clear();
  }
  /**
   * Returns a shallow copy of the MinHeap
   * @public
   * @returns {MinHeap}
   */
  clone() {
    return new rt(this._getCompareValue, this._heap.clone());
  }
  /**
   * Implements an iterable on the heap
   * @public
   */
  [Symbol.iterator]() {
    let e = this.size();
    return {
      next: () => (e -= 1, {
        value: this.pop(),
        done: e === -1
      })
    };
  }
  /**
   * Builds a MinHeap from an array
   * @public
   * @static
   * @param {array} values
   * @param {function} [getCompareValue]
   * @returns {MinHeap}
   */
  static heapify(e, n) {
    if (!Array.isArray(e))
      throw new Error("MinHeap.heapify expects an array");
    const r = new Pt(Ct(n), e);
    return new rt(n, r).fix();
  }
  /**
   * Checks if a list of values is a valid min heap
   * @public
   * @static
   * @param {array} values
   * @param {function} [getCompareValue]
   * @returns {boolean}
   */
  static isHeapified(e, n) {
    const r = new Pt(Ct(n), e);
    return new rt(n, r).isValid();
  }
};
Rn.MinHeap = Pr;
var Bn = {};
/**
 * @license MIT
 * @copyright 2020 Eyas Ranjous <eyas.ranjous@gmail.com>
 */
const { Heap: Et } = cn, St = (t) => (e, n) => {
  const r = typeof t == "function" ? t(e) : e, s = typeof t == "function" ? t(n) : n;
  return r < s ? 1 : -1;
};
let Cr = class st {
  /**
   * @param {function} [getCompareValue]
   * @param {Heap} [_heap]
   */
  constructor(e, n) {
    this._getCompareValue = e, this._heap = n || new Et(St(e));
  }
  /**
   * Inserts a new value into the heap
   * @public
   * @param {number|string|object} value
   * @returns {MaxHeap}
   */
  insert(e) {
    return this._heap.insert(e);
  }
  /**
   * Inserts a new value into the heap
   * @public
   * @param {number|string|object} value
   * @returns {Heap}
   */
  push(e) {
    return this.insert(e);
  }
  /**
   * Removes and returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  extractRoot() {
    return this._heap.extractRoot();
  }
  /**
   * Removes and returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  pop() {
    return this.extractRoot();
  }
  /**
   * Applies heap sort and return the values sorted by priority
   * @public
   * @returns {array}
   */
  sort() {
    return this._heap.sort();
  }
  /**
   * Converts the heap to a cloned array without sorting.
   * @public
   * @returns {Array}
   */
  toArray() {
    return Array.from(this._heap._nodes);
  }
  /**
   * Fixes node positions in the heap
   * @public
   * @returns {MaxHeap}
   */
  fix() {
    return this._heap.fix();
  }
  /**
   * Verifies that all heap nodes are in the right position
   * @public
   * @returns {boolean}
   */
  isValid() {
    return this._heap.isValid();
  }
  /**
   * Returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  root() {
    return this._heap.root();
  }
  /**
   * Returns the root node in the heap
   * @public
   * @returns {number|string|object}
   */
  top() {
    return this.root();
  }
  /**
   * Returns a leaf node in the heap
   * @public
   * @returns {number|string|object}
   */
  leaf() {
    return this._heap.leaf();
  }
  /**
   * Returns the number of nodes in the heap
   * @public
   * @returns {number}
   */
  size() {
    return this._heap.size();
  }
  /**
   * Checks if the heap is empty
   * @public
   * @returns {boolean}
   */
  isEmpty() {
    return this._heap.isEmpty();
  }
  /**
   * Clears the heap
   * @public
   */
  clear() {
    this._heap.clear();
  }
  /**
   * Returns a shallow copy of the MaxHeap
   * @public
   * @returns {MaxHeap}
   */
  clone() {
    return new st(this._getCompareValue, this._heap.clone());
  }
  /**
   * Implements an iterable on the heap
   * @public
   */
  [Symbol.iterator]() {
    let e = this.size();
    return {
      next: () => (e -= 1, {
        value: this.pop(),
        done: e === -1
      })
    };
  }
  /**
   * Builds a MaxHeap from an array
   * @public
   * @static
   * @param {array} values
   * @param {function} [getCompareValue]
   * @returns {MaxHeap}
   */
  static heapify(e, n) {
    if (!Array.isArray(e))
      throw new Error("MaxHeap.heapify expects an array");
    const r = new Et(St(n), e);
    return new st(n, r).fix();
  }
  /**
   * Checks if a list of values is a valid max heap
   * @public
   * @static
   * @param {array} values
   * @param {function} [getCompareValue]
   * @returns {boolean}
   */
  static isHeapified(e, n) {
    const r = new Et(St(n), e);
    return new st(n, r).isValid();
  }
};
Bn.MaxHeap = Cr;
const { MinHeap: Er } = Rn, { MaxHeap: Sr } = Bn;
var it = Er, xn = Sr;
const A = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : global, j = Object.keys, L = Array.isArray;
function $(t, e) {
  return typeof e != "object" || j(e).forEach(function(n) {
    t[n] = e[n];
  }), t;
}
typeof Promise > "u" || A.Promise || (A.Promise = Promise);
const Fe = Object.getPrototypeOf, Kr = {}.hasOwnProperty;
function V(t, e) {
  return Kr.call(t, e);
}
function Ee(t, e) {
  typeof e == "function" && (e = e(Fe(t))), (typeof Reflect > "u" ? j : Reflect.ownKeys)(e).forEach((n) => {
    ee(t, n, e[n]);
  });
}
const Fn = Object.defineProperty;
function ee(t, e, n, r) {
  Fn(t, e, $(n && V(n, "get") && typeof n.get == "function" ? { get: n.get, set: n.set, configurable: !0 } : { value: n, configurable: !0, writable: !0 }, r));
}
function ke(t) {
  return { from: function(e) {
    return t.prototype = Object.create(e.prototype), ee(t.prototype, "constructor", t), { extend: Ee.bind(null, t.prototype) };
  } };
}
const Dr = Object.getOwnPropertyDescriptor;
function un(t, e) {
  let n;
  return Dr(t, e) || (n = Fe(t)) && un(n, e);
}
const Mr = [].slice;
function ft(t, e, n) {
  return Mr.call(t, e, n);
}
function Ln(t, e) {
  return e(t);
}
function Ae(t) {
  if (!t) throw new Error("Assertion Failed");
}
function zn(t) {
  A.setImmediate ? setImmediate(t) : setTimeout(t, 0);
}
function qn(t, e) {
  return t.reduce((n, r, s) => {
    var i = e(r, s);
    return i && (n[i[0]] = i[1]), n;
  }, {});
}
function te(t, e) {
  if (typeof e == "string" && V(t, e)) return t[e];
  if (!e) return t;
  if (typeof e != "string") {
    for (var n = [], r = 0, s = e.length; r < s; ++r) {
      var i = te(t, e[r]);
      n.push(i);
    }
    return n;
  }
  var o = e.indexOf(".");
  if (o !== -1) {
    var a = t[e.substr(0, o)];
    return a == null ? void 0 : te(a, e.substr(o + 1));
  }
}
function W(t, e, n) {
  if (t && e !== void 0 && (!("isFrozen" in Object) || !Object.isFrozen(t))) if (typeof e != "string" && "length" in e) {
    Ae(typeof n != "string" && "length" in n);
    for (var r = 0, s = e.length; r < s; ++r) W(t, e[r], n[r]);
  } else {
    var i = e.indexOf(".");
    if (i !== -1) {
      var o = e.substr(0, i), a = e.substr(i + 1);
      if (a === "") n === void 0 ? L(t) && !isNaN(parseInt(o)) ? t.splice(o, 1) : delete t[o] : t[o] = n;
      else {
        var c = t[o];
        c && V(t, o) || (c = t[o] = {}), W(c, a, n);
      }
    } else n === void 0 ? L(t) && !isNaN(parseInt(e)) ? t.splice(e, 1) : delete t[e] : t[e] = n;
  }
}
function $n(t) {
  var e = {};
  for (var n in t) V(t, n) && (e[n] = t[n]);
  return e;
}
const Nr = [].concat;
function Hn(t) {
  return Nr.apply([], t);
}
const Un = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(Hn([8, 16, 32, 64].map((t) => ["Int", "Uint", "Float"].map((e) => e + t + "Array")))).filter((t) => A[t]), Ar = Un.map((t) => A[t]);
qn(Un, (t) => [t, !0]);
let se = null;
function Ve(t) {
  se = typeof WeakMap < "u" && /* @__PURE__ */ new WeakMap();
  const e = jt(t);
  return se = null, e;
}
function jt(t) {
  if (!t || typeof t != "object") return t;
  let e = se && se.get(t);
  if (e) return e;
  if (L(t)) {
    e = [], se && se.set(t, e);
    for (var n = 0, r = t.length; n < r; ++n) e.push(jt(t[n]));
  } else if (Ar.indexOf(t.constructor) >= 0) e = t;
  else {
    const i = Fe(t);
    for (var s in e = i === Object.prototype ? {} : Object.create(i), se && se.set(t, e), t) V(t, s) && (e[s] = jt(t[s]));
  }
  return e;
}
const { toString: Or } = {};
function Rt(t) {
  return Or.call(t).slice(8, -1);
}
const Bt = typeof Symbol < "u" ? Symbol.iterator : "@@iterator", Ir = typeof Bt == "symbol" ? function(t) {
  var e;
  return t != null && (e = t[Bt]) && e.apply(t);
} : function() {
  return null;
}, xe = {};
function X(t) {
  var e, n, r, s;
  if (arguments.length === 1) {
    if (L(t)) return t.slice();
    if (this === xe && typeof t == "string") return [t];
    if (s = Ir(t)) {
      for (n = []; !(r = s.next()).done; ) n.push(r.value);
      return n;
    }
    if (t == null) return [t];
    if (typeof (e = t.length) == "number") {
      for (n = new Array(e); e--; ) n[e] = t[e];
      return n;
    }
    return [t];
  }
  for (e = arguments.length, n = new Array(e); e--; ) n[e] = arguments[e];
  return n;
}
const ln = typeof Symbol < "u" ? (t) => t[Symbol.toStringTag] === "AsyncFunction" : () => !1;
var Y = typeof location < "u" && /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
function Vn(t, e) {
  Y = t, Wn = e;
}
var Wn = () => !0;
const Tr = !new Error("").stack;
function ge() {
  if (Tr) try {
    throw ge.arguments, new Error();
  } catch (t) {
    return t;
  }
  return new Error();
}
function Ft(t, e) {
  var n = t.stack;
  return n ? (e = e || 0, n.indexOf(t.name) === 0 && (e += (t.name + t.message).split(`
`).length), n.split(`
`).slice(e).filter(Wn).map((r) => `
` + r).join("")) : "";
}
var Gn = ["Unknown", "Constraint", "Data", "TransactionInactive", "ReadOnly", "Version", "NotFound", "InvalidState", "InvalidAccess", "Abort", "Timeout", "QuotaExceeded", "Syntax", "DataClone"], hn = ["Modify", "Bulk", "OpenFailed", "VersionChange", "Schema", "Upgrade", "InvalidTable", "MissingAPI", "NoSuchDatabase", "InvalidArgument", "SubTransaction", "Unsupported", "Internal", "DatabaseClosed", "PrematureCommit", "ForeignAwait"].concat(Gn), jr = { VersionChanged: "Database version changed by other database connection", DatabaseClosed: "Database has been closed", Abort: "Transaction aborted", TransactionInactive: "Transaction has already completed or failed", MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb" };
function Pe(t, e) {
  this._e = ge(), this.name = t, this.message = e;
}
function Yn(t, e) {
  return t + ". Errors: " + Object.keys(e).map((n) => e[n].toString()).filter((n, r, s) => s.indexOf(n) === r).join(`
`);
}
function pt(t, e, n, r) {
  this._e = ge(), this.failures = e, this.failedKeys = r, this.successCount = n, this.message = Yn(t, e);
}
function Ie(t, e) {
  this._e = ge(), this.name = "BulkError", this.failures = Object.keys(e).map((n) => e[n]), this.failuresByPos = e, this.message = Yn(t, e);
}
ke(Pe).from(Error).extend({ stack: { get: function() {
  return this._stack || (this._stack = this.name + ": " + this.message + Ft(this._e, 2));
} }, toString: function() {
  return this.name + ": " + this.message;
} }), ke(pt).from(Pe), ke(Ie).from(Pe);
var dn = hn.reduce((t, e) => (t[e] = e + "Error", t), {});
const Rr = Pe;
var S = hn.reduce((t, e) => {
  var n = e + "Error";
  function r(s, i) {
    this._e = ge(), this.name = n, s ? typeof s == "string" ? (this.message = `${s}${i ? `
 ` + i : ""}`, this.inner = i || null) : typeof s == "object" && (this.message = `${s.name} ${s.message}`, this.inner = s) : (this.message = jr[e] || n, this.inner = null);
  }
  return ke(r).from(Rr), t[e] = r, t;
}, {});
S.Syntax = SyntaxError, S.Type = TypeError, S.Range = RangeError;
var kn = Gn.reduce((t, e) => (t[e + "Error"] = S[e], t), {}), ot = hn.reduce((t, e) => (["Syntax", "Type", "Range"].indexOf(e) === -1 && (t[e + "Error"] = S[e]), t), {});
function N() {
}
function Le(t) {
  return t;
}
function Br(t, e) {
  return t == null || t === Le ? e : function(n) {
    return e(t(n));
  };
}
function ye(t, e) {
  return function() {
    t.apply(this, arguments), e.apply(this, arguments);
  };
}
function Fr(t, e) {
  return t === N ? e : function() {
    var n = t.apply(this, arguments);
    n !== void 0 && (arguments[0] = n);
    var r = this.onsuccess, s = this.onerror;
    this.onsuccess = null, this.onerror = null;
    var i = e.apply(this, arguments);
    return r && (this.onsuccess = this.onsuccess ? ye(r, this.onsuccess) : r), s && (this.onerror = this.onerror ? ye(s, this.onerror) : s), i !== void 0 ? i : n;
  };
}
function Lr(t, e) {
  return t === N ? e : function() {
    t.apply(this, arguments);
    var n = this.onsuccess, r = this.onerror;
    this.onsuccess = this.onerror = null, e.apply(this, arguments), n && (this.onsuccess = this.onsuccess ? ye(n, this.onsuccess) : n), r && (this.onerror = this.onerror ? ye(r, this.onerror) : r);
  };
}
function zr(t, e) {
  return t === N ? e : function(n) {
    var r = t.apply(this, arguments);
    $(n, r);
    var s = this.onsuccess, i = this.onerror;
    this.onsuccess = null, this.onerror = null;
    var o = e.apply(this, arguments);
    return s && (this.onsuccess = this.onsuccess ? ye(s, this.onsuccess) : s), i && (this.onerror = this.onerror ? ye(i, this.onerror) : i), r === void 0 ? o === void 0 ? void 0 : o : $(r, o);
  };
}
function qr(t, e) {
  return t === N ? e : function() {
    return e.apply(this, arguments) !== !1 && t.apply(this, arguments);
  };
}
function fn(t, e) {
  return t === N ? e : function() {
    var n = t.apply(this, arguments);
    if (n && typeof n.then == "function") {
      for (var r = this, s = arguments.length, i = new Array(s); s--; ) i[s] = arguments[s];
      return n.then(function() {
        return e.apply(r, i);
      });
    }
    return e.apply(this, arguments);
  };
}
ot.ModifyError = pt, ot.DexieError = Pe, ot.BulkError = Ie;
var ze = {};
const Jn = 100, [Lt, yt, zt] = typeof Promise > "u" ? [] : (() => {
  let t = Promise.resolve();
  if (typeof crypto > "u" || !crypto.subtle) return [t, Fe(t), t];
  const e = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
  return [e, Fe(e), t];
})(), Qn = yt && yt.then, at = Lt && Lt.constructor, pn = !!zt;
var qt = !1, $r = zt ? () => {
  zt.then(Ye);
} : A.setImmediate ? setImmediate.bind(null, Ye) : A.MutationObserver ? () => {
  var t = document.createElement("div");
  new MutationObserver(() => {
    Ye(), t = null;
  }).observe(t, { attributes: !0 }), t.setAttribute("i", "1");
} : () => {
  setTimeout(Ye, 0);
}, Te = function(t, e) {
  Oe.push([t, e]), mt && ($r(), mt = !1);
}, $t = !0, mt = !0, de = [], ct = [], Ht = null, Ut = Le, Ce = { id: "global", global: !0, ref: 0, unhandleds: [], onunhandled: En, pgp: !1, env: {}, finalize: function() {
  this.unhandleds.forEach((t) => {
    try {
      En(t[0], t[1]);
    } catch {
    }
  });
} }, E = Ce, Oe = [], fe = 0, ut = [];
function P(t) {
  if (typeof this != "object") throw new TypeError("Promises must be constructed via new");
  this._listeners = [], this.onuncatched = N, this._lib = !1;
  var e = this._PSD = E;
  if (Y && (this._stackHolder = ge(), this._prev = null, this._numPrev = 0), typeof t != "function") {
    if (t !== ze) throw new TypeError("Not a function");
    return this._state = arguments[1], this._value = arguments[2], void (this._state === !1 && Wt(this, this._value));
  }
  this._state = null, this._value = null, ++e.ref, Zn(this, t);
}
const Vt = { get: function() {
  var t = E, e = gt;
  function n(r, s) {
    var i = !t.global && (t !== E || e !== gt);
    const o = i && !ne();
    var a = new P((c, h) => {
      yn(this, new Xn(bt(r, t, i, o), bt(s, t, i, o), c, h, t));
    });
    return Y && nr(a, this), a;
  }
  return n.prototype = ze, n;
}, set: function(t) {
  ee(this, "then", t && t.prototype === ze ? Vt : { get: function() {
    return t;
  }, set: Vt.set });
} };
function Xn(t, e, n, r, s) {
  this.onFulfilled = typeof t == "function" ? t : null, this.onRejected = typeof e == "function" ? e : null, this.resolve = n, this.reject = r, this.psd = s;
}
function Zn(t, e) {
  try {
    e((n) => {
      if (t._state === null) {
        if (n === t) throw new TypeError("A promise cannot be resolved with itself.");
        var r = t._lib && We();
        n && typeof n.then == "function" ? Zn(t, (s, i) => {
          n instanceof P ? n._then(s, i) : n.then(s, i);
        }) : (t._state = !0, t._value = n, er(t)), r && Ge();
      }
    }, Wt.bind(null, t));
  } catch (n) {
    Wt(t, n);
  }
}
function Wt(t, e) {
  if (ct.push(e), t._state === null) {
    var n = t._lib && We();
    e = Ut(e), t._state = !1, t._value = e, Y && e !== null && typeof e == "object" && !e._promise && function(r, s, i) {
      try {
        r.apply(null, i);
      } catch {
      }
    }(() => {
      var r = un(e, "stack");
      e._promise = t, ee(e, "stack", { get: () => qt ? r && (r.get ? r.get.apply(e) : r.value) : t.stack });
    }), function(r) {
      de.some((s) => s._value === r._value) || de.push(r);
    }(t), er(t), n && Ge();
  }
}
function er(t) {
  var e = t._listeners;
  t._listeners = [];
  for (var n = 0, r = e.length; n < r; ++n) yn(t, e[n]);
  var s = t._PSD;
  --s.ref || s.finalize(), fe === 0 && (++fe, Te(() => {
    --fe == 0 && mn();
  }, []));
}
function yn(t, e) {
  if (t._state !== null) {
    var n = t._state ? e.onFulfilled : e.onRejected;
    if (n === null) return (t._state ? e.resolve : e.reject)(t._value);
    ++e.psd.ref, ++fe, Te(Hr, [n, t, e]);
  } else t._listeners.push(e);
}
function Hr(t, e, n) {
  try {
    Ht = e;
    var r, s = e._value;
    e._state ? r = t(s) : (ct.length && (ct = []), r = t(s), ct.indexOf(s) === -1 && function(i) {
      for (var o = de.length; o; ) if (de[--o]._value === i._value) return void de.splice(o, 1);
    }(e)), n.resolve(r);
  } catch (i) {
    n.reject(i);
  } finally {
    Ht = null, --fe == 0 && mn(), --n.psd.ref || n.psd.finalize();
  }
}
function tr(t, e, n) {
  if (e.length === n) return e;
  var r = "";
  if (t._state === !1) {
    var s, i, o = t._value;
    o != null ? (s = o.name || "Error", i = o.message || o, r = Ft(o, 0)) : (s = o, i = ""), e.push(s + (i ? ": " + i : "") + r);
  }
  return Y && ((r = Ft(t._stackHolder, 2)) && e.indexOf(r) === -1 && e.push(r), t._prev && tr(t._prev, e, n)), e;
}
function nr(t, e) {
  var n = e ? e._numPrev + 1 : 0;
  n < 100 && (t._prev = e, t._numPrev = n);
}
function Ye() {
  We() && Ge();
}
function We() {
  var t = $t;
  return $t = !1, mt = !1, t;
}
function Ge() {
  var t, e, n;
  do
    for (; Oe.length > 0; ) for (t = Oe, Oe = [], n = t.length, e = 0; e < n; ++e) {
      var r = t[e];
      r[0].apply(null, r[1]);
    }
  while (Oe.length > 0);
  $t = !0, mt = !0;
}
function mn() {
  var t = de;
  de = [], t.forEach((r) => {
    r._PSD.onunhandled.call(null, r._value, r);
  });
  for (var e = ut.slice(0), n = e.length; n; ) e[--n]();
}
function Je(t) {
  return new P(ze, !1, t);
}
function O(t, e) {
  var n = E;
  return function() {
    var r = We(), s = E;
    try {
      return ae(n, !0), t.apply(this, arguments);
    } catch (i) {
      e && e(i);
    } finally {
      ae(s, !1), r && Ge();
    }
  };
}
Ee(P.prototype, { then: Vt, _then: function(t, e) {
  yn(this, new Xn(null, null, t, e, E));
}, catch: function(t) {
  if (arguments.length === 1) return this.then(null, t);
  var e = arguments[0], n = arguments[1];
  return typeof e == "function" ? this.then(null, (r) => r instanceof e ? n(r) : Je(r)) : this.then(null, (r) => r && r.name === e ? n(r) : Je(r));
}, finally: function(t) {
  return this.then((e) => (t(), e), (e) => (t(), Je(e)));
}, stack: { get: function() {
  if (this._stack) return this._stack;
  try {
    qt = !0;
    var t = tr(this, [], 20).join(`
From previous: `);
    return this._state !== null && (this._stack = t), t;
  } finally {
    qt = !1;
  }
} }, timeout: function(t, e) {
  return t < 1 / 0 ? new P((n, r) => {
    var s = setTimeout(() => r(new S.Timeout(e)), t);
    this.then(n, r).finally(clearTimeout.bind(null, s));
  }) : this;
} }), typeof Symbol < "u" && Symbol.toStringTag && ee(P.prototype, Symbol.toStringTag, "Dexie.Promise"), Ce.env = rr(), Ee(P, { all: function() {
  var t = X.apply(null, arguments).map(Qe);
  return new P(function(e, n) {
    t.length === 0 && e([]);
    var r = t.length;
    t.forEach((s, i) => P.resolve(s).then((o) => {
      t[i] = o, --r || e(t);
    }, n));
  });
}, resolve: (t) => {
  if (t instanceof P) return t;
  if (t && typeof t.then == "function") return new P((n, r) => {
    t.then(n, r);
  });
  var e = new P(ze, !0, t);
  return nr(e, Ht), e;
}, reject: Je, race: function() {
  var t = X.apply(null, arguments).map(Qe);
  return new P((e, n) => {
    t.map((r) => P.resolve(r).then(e, n));
  });
}, PSD: { get: () => E, set: (t) => E = t }, totalEchoes: { get: () => gt }, newPSD: oe, usePSD: Ke, scheduler: { get: () => Te, set: (t) => {
  Te = t;
} }, rejectionMapper: { get: () => Ut, set: (t) => {
  Ut = t;
} }, follow: (t, e) => new P((n, r) => oe((s, i) => {
  var o = E;
  o.unhandleds = [], o.onunhandled = i, o.finalize = ye(function() {
    (function(a) {
      function c() {
        a(), ut.splice(ut.indexOf(c), 1);
      }
      ut.push(c), ++fe, Te(() => {
        --fe == 0 && mn();
      }, []);
    })(() => {
      this.unhandleds.length === 0 ? s() : i(this.unhandleds[0]);
    });
  }, o.finalize), t();
}, e, n, r)) }), at && (at.allSettled && ee(P, "allSettled", function() {
  const t = X.apply(null, arguments).map(Qe);
  return new P((e) => {
    t.length === 0 && e([]);
    let n = t.length;
    const r = new Array(n);
    t.forEach((s, i) => P.resolve(s).then((o) => r[i] = { status: "fulfilled", value: o }, (o) => r[i] = { status: "rejected", reason: o }).then(() => --n || e(r)));
  });
}), at.any && typeof AggregateError < "u" && ee(P, "any", function() {
  const t = X.apply(null, arguments).map(Qe);
  return new P((e, n) => {
    t.length === 0 && n(new AggregateError([]));
    let r = t.length;
    const s = new Array(r);
    t.forEach((i, o) => P.resolve(i).then((a) => e(a), (a) => {
      s[o] = a, --r || n(new AggregateError(s));
    }));
  });
}));
const F = { awaits: 0, echoes: 0, id: 0 };
var Ur = 0, lt = [], Kt = 0, gt = 0, Vr = 0;
function oe(t, e, n, r) {
  var s = E, i = Object.create(s);
  i.parent = s, i.ref = 0, i.global = !1, i.id = ++Vr;
  var o = Ce.env;
  i.env = pn ? { Promise: P, PromiseProp: { value: P, configurable: !0, writable: !0 }, all: P.all, race: P.race, allSettled: P.allSettled, any: P.any, resolve: P.resolve, reject: P.reject, nthen: Pn(o.nthen, i), gthen: Pn(o.gthen, i) } : {}, e && $(i, e), ++s.ref, i.finalize = function() {
    --this.parent.ref || this.parent.finalize();
  };
  var a = Ke(i, t, n, r);
  return i.ref === 0 && i.finalize(), a;
}
function Se() {
  return F.id || (F.id = ++Ur), ++F.awaits, F.echoes += Jn, F.id;
}
function ne() {
  return !!F.awaits && (--F.awaits == 0 && (F.id = 0), F.echoes = F.awaits * Jn, !0);
}
function Qe(t) {
  return F.echoes && t && t.constructor === at ? (Se(), t.then((e) => (ne(), e), (e) => (ne(), R(e)))) : t;
}
function Wr(t) {
  ++gt, F.echoes && --F.echoes != 0 || (F.echoes = F.id = 0), lt.push(E), ae(t, !0);
}
function Gr() {
  var t = lt[lt.length - 1];
  lt.pop(), ae(t, !1);
}
function ae(t, e) {
  var n = E;
  if ((e ? !F.echoes || Kt++ && t === E : !Kt || --Kt && t === E) || sr(e ? Wr.bind(null, t) : Gr), t !== E && (E = t, n === Ce && (Ce.env = rr()), pn)) {
    var r = Ce.env.Promise, s = t.env;
    yt.then = s.nthen, r.prototype.then = s.gthen, (n.global || t.global) && (Object.defineProperty(A, "Promise", s.PromiseProp), r.all = s.all, r.race = s.race, r.resolve = s.resolve, r.reject = s.reject, s.allSettled && (r.allSettled = s.allSettled), s.any && (r.any = s.any));
  }
}
function rr() {
  var t = A.Promise;
  return pn ? { Promise: t, PromiseProp: Object.getOwnPropertyDescriptor(A, "Promise"), all: t.all, race: t.race, allSettled: t.allSettled, any: t.any, resolve: t.resolve, reject: t.reject, nthen: yt.then, gthen: t.prototype.then } : {};
}
function Ke(t, e, n, r, s) {
  var i = E;
  try {
    return ae(t, !0), e(n, r, s);
  } finally {
    ae(i, !1);
  }
}
function sr(t) {
  Qn.call(Lt, t);
}
function bt(t, e, n, r) {
  return typeof t != "function" ? t : function() {
    var s = E;
    n && Se(), ae(e, !0);
    try {
      return t.apply(this, arguments);
    } finally {
      ae(s, !1), r && sr(ne);
    }
  };
}
function Pn(t, e) {
  return function(n, r) {
    return t.call(this, bt(n, e), bt(r, e));
  };
}
("" + Qn).indexOf("[native code]") === -1 && (Se = ne = N);
const Cn = "unhandledrejection";
function En(t, e) {
  var n;
  try {
    n = e.onuncatched(t);
  } catch {
  }
  if (n !== !1) try {
    var r, s = { promise: e, reason: t };
    if (A.document && document.createEvent ? ((r = document.createEvent("Event")).initEvent(Cn, !0, !0), $(r, s)) : A.CustomEvent && $(r = new CustomEvent(Cn, { detail: s }), s), r && A.dispatchEvent && (dispatchEvent(r), !A.PromiseRejectionEvent && A.onunhandledrejection)) try {
      A.onunhandledrejection(r);
    } catch {
    }
    Y && r && !r.defaultPrevented && console.warn(`Unhandled rejection: ${t.stack || t}`);
  } catch {
  }
}
var R = P.reject;
function Gt(t, e, n, r) {
  if (t.idbdb && (t._state.openComplete || E.letThrough || t._vip)) {
    var s = t._createTransaction(e, n, t._dbSchema);
    try {
      s.create(), t._state.PR1398_maxLoop = 3;
    } catch (i) {
      return i.name === dn.InvalidState && t.isOpen() && --t._state.PR1398_maxLoop > 0 ? (console.warn("Dexie: Need to reopen db"), t._close(), t.open().then(() => Gt(t, e, n, r))) : R(i);
    }
    return s._promise(e, (i, o) => oe(() => (E.trans = s, r(i, o, s)))).then((i) => s._completion.then(() => i));
  }
  if (t._state.openComplete) return R(new S.DatabaseClosed(t._state.dbOpenError));
  if (!t._state.isBeingOpened) {
    if (!t._options.autoOpen) return R(new S.DatabaseClosed());
    t.open().catch(N);
  }
  return t._state.dbReadyPromise.then(() => Gt(t, e, n, r));
}
const Sn = "3.2.7", he = "￿", Yt = -1 / 0, J = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.", ir = "String expected.", je = [], _t = typeof navigator < "u" && /(MSIE|Trident|Edge)/.test(navigator.userAgent), Yr = _t, Jr = _t, or = (t) => !/(dexie\.js|dexie\.min\.js)/.test(t), xt = "__dbnames", Dt = "readonly", Mt = "readwrite";
function me(t, e) {
  return t ? e ? function() {
    return t.apply(this, arguments) && e.apply(this, arguments);
  } : t : e;
}
const ar = { type: 3, lower: -1 / 0, lowerOpen: !1, upper: [[]], upperOpen: !1 };
function Xe(t) {
  return typeof t != "string" || /\./.test(t) ? (e) => e : (e) => (e[t] === void 0 && t in e && delete (e = Ve(e))[t], e);
}
class Qr {
  _trans(e, n, r) {
    const s = this._tx || E.trans, i = this.name;
    function o(c, h, u) {
      if (!u.schema[i]) throw new S.NotFound("Table " + i + " not part of transaction");
      return n(u.idbtrans, u);
    }
    const a = We();
    try {
      return s && s.db === this.db ? s === E.trans ? s._promise(e, o, r) : oe(() => s._promise(e, o, r), { trans: s, transless: E.transless || E }) : Gt(this.db, e, [this.name], o);
    } finally {
      a && Ge();
    }
  }
  get(e, n) {
    return e && e.constructor === Object ? this.where(e).first(n) : this._trans("readonly", (r) => this.core.get({ trans: r, key: e }).then((s) => this.hook.reading.fire(s))).then(n);
  }
  where(e) {
    if (typeof e == "string") return new this.db.WhereClause(this, e);
    if (L(e)) return new this.db.WhereClause(this, `[${e.join("+")}]`);
    const n = j(e);
    if (n.length === 1) return this.where(n[0]).equals(e[n[0]]);
    const r = this.schema.indexes.concat(this.schema.primKey).filter((h) => {
      if (h.compound && n.every((u) => h.keyPath.indexOf(u) >= 0)) {
        for (let u = 0; u < n.length; ++u) if (n.indexOf(h.keyPath[u]) === -1) return !1;
        return !0;
      }
      return !1;
    }).sort((h, u) => h.keyPath.length - u.keyPath.length)[0];
    if (r && this.db._maxKey !== he) {
      const h = r.keyPath.slice(0, n.length);
      return this.where(h).equals(h.map((u) => e[u]));
    }
    !r && Y && console.warn(`The query ${JSON.stringify(e)} on ${this.name} would benefit of a compound index [${n.join("+")}]`);
    const { idxByName: s } = this.schema, i = this.db._deps.indexedDB;
    function o(h, u) {
      try {
        return i.cmp(h, u) === 0;
      } catch {
        return !1;
      }
    }
    const [a, c] = n.reduce(([h, u], d) => {
      const l = s[d], f = e[d];
      return [h || l, h || !l ? me(u, l && l.multi ? (g) => {
        const p = te(g, d);
        return L(p) && p.some((b) => o(f, b));
      } : (g) => o(f, te(g, d))) : u];
    }, [null, null]);
    return a ? this.where(a.name).equals(e[a.keyPath]).filter(c) : r ? this.filter(c) : this.where(n).equals("");
  }
  filter(e) {
    return this.toCollection().and(e);
  }
  count(e) {
    return this.toCollection().count(e);
  }
  offset(e) {
    return this.toCollection().offset(e);
  }
  limit(e) {
    return this.toCollection().limit(e);
  }
  each(e) {
    return this.toCollection().each(e);
  }
  toArray(e) {
    return this.toCollection().toArray(e);
  }
  toCollection() {
    return new this.db.Collection(new this.db.WhereClause(this));
  }
  orderBy(e) {
    return new this.db.Collection(new this.db.WhereClause(this, L(e) ? `[${e.join("+")}]` : e));
  }
  reverse() {
    return this.toCollection().reverse();
  }
  mapToClass(e) {
    this.schema.mappedClass = e;
    const n = (r) => {
      if (!r) return r;
      const s = Object.create(e.prototype);
      for (var i in r) if (V(r, i)) try {
        s[i] = r[i];
      } catch {
      }
      return s;
    };
    return this.schema.readHook && this.hook.reading.unsubscribe(this.schema.readHook), this.schema.readHook = n, this.hook("reading", n), e;
  }
  defineClass() {
    return this.mapToClass(function(e) {
      $(this, e);
    });
  }
  add(e, n) {
    const { auto: r, keyPath: s } = this.schema.primKey;
    let i = e;
    return s && r && (i = Xe(s)(e)), this._trans("readwrite", (o) => this.core.mutate({ trans: o, type: "add", keys: n != null ? [n] : null, values: [i] })).then((o) => o.numFailures ? P.reject(o.failures[0]) : o.lastResult).then((o) => {
      if (s) try {
        W(e, s, o);
      } catch {
      }
      return o;
    });
  }
  update(e, n) {
    if (typeof e != "object" || L(e)) return this.where(":id").equals(e).modify(n);
    {
      const r = te(e, this.schema.primKey.keyPath);
      if (r === void 0) return R(new S.InvalidArgument("Given object does not contain its primary key"));
      try {
        typeof n != "function" ? j(n).forEach((s) => {
          W(e, s, n[s]);
        }) : n(e, { value: e, primKey: r });
      } catch {
      }
      return this.where(":id").equals(r).modify(n);
    }
  }
  put(e, n) {
    const { auto: r, keyPath: s } = this.schema.primKey;
    let i = e;
    return s && r && (i = Xe(s)(e)), this._trans("readwrite", (o) => this.core.mutate({ trans: o, type: "put", values: [i], keys: n != null ? [n] : null })).then((o) => o.numFailures ? P.reject(o.failures[0]) : o.lastResult).then((o) => {
      if (s) try {
        W(e, s, o);
      } catch {
      }
      return o;
    });
  }
  delete(e) {
    return this._trans("readwrite", (n) => this.core.mutate({ trans: n, type: "delete", keys: [e] })).then((n) => n.numFailures ? P.reject(n.failures[0]) : void 0);
  }
  clear() {
    return this._trans("readwrite", (e) => this.core.mutate({ trans: e, type: "deleteRange", range: ar })).then((e) => e.numFailures ? P.reject(e.failures[0]) : void 0);
  }
  bulkGet(e) {
    return this._trans("readonly", (n) => this.core.getMany({ keys: e, trans: n }).then((r) => r.map((s) => this.hook.reading.fire(s))));
  }
  bulkAdd(e, n, r) {
    const s = Array.isArray(n) ? n : void 0, i = (r = r || (s ? void 0 : n)) ? r.allKeys : void 0;
    return this._trans("readwrite", (o) => {
      const { auto: a, keyPath: c } = this.schema.primKey;
      if (c && s) throw new S.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
      if (s && s.length !== e.length) throw new S.InvalidArgument("Arguments objects and keys must have the same length");
      const h = e.length;
      let u = c && a ? e.map(Xe(c)) : e;
      return this.core.mutate({ trans: o, type: "add", keys: s, values: u, wantResults: i }).then(({ numFailures: d, results: l, lastResult: f, failures: g }) => {
        if (d === 0) return i ? l : f;
        throw new Ie(`${this.name}.bulkAdd(): ${d} of ${h} operations failed`, g);
      });
    });
  }
  bulkPut(e, n, r) {
    const s = Array.isArray(n) ? n : void 0, i = (r = r || (s ? void 0 : n)) ? r.allKeys : void 0;
    return this._trans("readwrite", (o) => {
      const { auto: a, keyPath: c } = this.schema.primKey;
      if (c && s) throw new S.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
      if (s && s.length !== e.length) throw new S.InvalidArgument("Arguments objects and keys must have the same length");
      const h = e.length;
      let u = c && a ? e.map(Xe(c)) : e;
      return this.core.mutate({ trans: o, type: "put", keys: s, values: u, wantResults: i }).then(({ numFailures: d, results: l, lastResult: f, failures: g }) => {
        if (d === 0) return i ? l : f;
        throw new Ie(`${this.name}.bulkPut(): ${d} of ${h} operations failed`, g);
      });
    });
  }
  bulkDelete(e) {
    const n = e.length;
    return this._trans("readwrite", (r) => this.core.mutate({ trans: r, type: "delete", keys: e })).then(({ numFailures: r, lastResult: s, failures: i }) => {
      if (r === 0) return s;
      throw new Ie(`${this.name}.bulkDelete(): ${r} of ${n} operations failed`, i);
    });
  }
}
function Re(t) {
  var e = {}, n = function(o, a) {
    if (a) {
      for (var c = arguments.length, h = new Array(c - 1); --c; ) h[c - 1] = arguments[c];
      return e[o].subscribe.apply(null, h), t;
    }
    if (typeof o == "string") return e[o];
  };
  n.addEventType = i;
  for (var r = 1, s = arguments.length; r < s; ++r) i(arguments[r]);
  return n;
  function i(o, a, c) {
    if (typeof o != "object") {
      var h;
      a || (a = qr), c || (c = N);
      var u = { subscribers: [], fire: c, subscribe: function(d) {
        u.subscribers.indexOf(d) === -1 && (u.subscribers.push(d), u.fire = a(u.fire, d));
      }, unsubscribe: function(d) {
        u.subscribers = u.subscribers.filter(function(l) {
          return l !== d;
        }), u.fire = u.subscribers.reduce(a, c);
      } };
      return e[o] = n[o] = u, u;
    }
    j(h = o).forEach(function(d) {
      var l = h[d];
      if (L(l)) i(d, h[d][0], h[d][1]);
      else {
        if (l !== "asap") throw new S.InvalidArgument("Invalid event config");
        var f = i(d, Le, function() {
          for (var g = arguments.length, p = new Array(g); g--; ) p[g] = arguments[g];
          f.subscribers.forEach(function(b) {
            zn(function() {
              b.apply(null, p);
            });
          });
        });
      }
    });
  }
}
function Me(t, e) {
  return ke(e).from({ prototype: t }), e;
}
function we(t, e) {
  return !(t.filter || t.algorithm || t.or) && (e ? t.justLimit : !t.replayFilter);
}
function Nt(t, e) {
  t.filter = me(t.filter, e);
}
function At(t, e, n) {
  var r = t.replayFilter;
  t.replayFilter = r ? () => me(r(), e()) : e, t.justLimit = n && !r;
}
function ht(t, e) {
  if (t.isPrimKey) return e.primaryKey;
  const n = e.getIndexByKeyPath(t.index);
  if (!n) throw new S.Schema("KeyPath " + t.index + " on object store " + e.name + " is not indexed");
  return n;
}
function Kn(t, e, n) {
  const r = ht(t, e.schema);
  return e.openCursor({ trans: n, values: !t.keysOnly, reverse: t.dir === "prev", unique: !!t.unique, query: { index: r, range: t.range } });
}
function Ze(t, e, n, r) {
  const s = t.replayFilter ? me(t.filter, t.replayFilter()) : t.filter;
  if (t.or) {
    const i = {}, o = (a, c, h) => {
      if (!s || s(c, h, (l) => c.stop(l), (l) => c.fail(l))) {
        var u = c.primaryKey, d = "" + u;
        d === "[object ArrayBuffer]" && (d = "" + new Uint8Array(u)), V(i, d) || (i[d] = !0, e(a, c, h));
      }
    };
    return Promise.all([t.or._iterate(o, n), Dn(Kn(t, r, n), t.algorithm, o, !t.keysOnly && t.valueMapper)]);
  }
  return Dn(Kn(t, r, n), me(t.algorithm, s), e, !t.keysOnly && t.valueMapper);
}
function Dn(t, e, n, r) {
  var s = O(r ? (i, o, a) => n(r(i), o, a) : n);
  return t.then((i) => {
    if (i) return i.start(() => {
      var o = () => i.continue();
      e && !e(i, (a) => o = a, (a) => {
        i.stop(a), o = N;
      }, (a) => {
        i.fail(a), o = N;
      }) || s(i.value, i, (a) => o = a), o();
    });
  });
}
function q(t, e) {
  try {
    const n = Mn(t), r = Mn(e);
    if (n !== r) return n === "Array" ? 1 : r === "Array" ? -1 : n === "binary" ? 1 : r === "binary" ? -1 : n === "string" ? 1 : r === "string" ? -1 : n === "Date" ? 1 : r !== "Date" ? NaN : -1;
    switch (n) {
      case "number":
      case "Date":
      case "string":
        return t > e ? 1 : t < e ? -1 : 0;
      case "binary":
        return function(s, i) {
          const o = s.length, a = i.length, c = o < a ? o : a;
          for (let h = 0; h < c; ++h) if (s[h] !== i[h]) return s[h] < i[h] ? -1 : 1;
          return o === a ? 0 : o < a ? -1 : 1;
        }(Nn(t), Nn(e));
      case "Array":
        return function(s, i) {
          const o = s.length, a = i.length, c = o < a ? o : a;
          for (let h = 0; h < c; ++h) {
            const u = q(s[h], i[h]);
            if (u !== 0) return u;
          }
          return o === a ? 0 : o < a ? -1 : 1;
        }(t, e);
    }
  } catch {
  }
  return NaN;
}
function Mn(t) {
  const e = typeof t;
  if (e !== "object") return e;
  if (ArrayBuffer.isView(t)) return "binary";
  const n = Rt(t);
  return n === "ArrayBuffer" ? "binary" : n;
}
function Nn(t) {
  return t instanceof Uint8Array ? t : ArrayBuffer.isView(t) ? new Uint8Array(t.buffer, t.byteOffset, t.byteLength) : new Uint8Array(t);
}
class Xr {
  _read(e, n) {
    var r = this._ctx;
    return r.error ? r.table._trans(null, R.bind(null, r.error)) : r.table._trans("readonly", e).then(n);
  }
  _write(e) {
    var n = this._ctx;
    return n.error ? n.table._trans(null, R.bind(null, n.error)) : n.table._trans("readwrite", e, "locked");
  }
  _addAlgorithm(e) {
    var n = this._ctx;
    n.algorithm = me(n.algorithm, e);
  }
  _iterate(e, n) {
    return Ze(this._ctx, e, n, this._ctx.table.core);
  }
  clone(e) {
    var n = Object.create(this.constructor.prototype), r = Object.create(this._ctx);
    return e && $(r, e), n._ctx = r, n;
  }
  raw() {
    return this._ctx.valueMapper = null, this;
  }
  each(e) {
    var n = this._ctx;
    return this._read((r) => Ze(n, e, r, n.table.core));
  }
  count(e) {
    return this._read((n) => {
      const r = this._ctx, s = r.table.core;
      if (we(r, !0)) return s.count({ trans: n, query: { index: ht(r, s.schema), range: r.range } }).then((o) => Math.min(o, r.limit));
      var i = 0;
      return Ze(r, () => (++i, !1), n, s).then(() => i);
    }).then(e);
  }
  sortBy(e, n) {
    const r = e.split(".").reverse(), s = r[0], i = r.length - 1;
    function o(h, u) {
      return u ? o(h[r[u]], u - 1) : h[s];
    }
    var a = this._ctx.dir === "next" ? 1 : -1;
    function c(h, u) {
      var d = o(h, i), l = o(u, i);
      return d < l ? -a : d > l ? a : 0;
    }
    return this.toArray(function(h) {
      return h.sort(c);
    }).then(n);
  }
  toArray(e) {
    return this._read((n) => {
      var r = this._ctx;
      if (r.dir === "next" && we(r, !0) && r.limit > 0) {
        const { valueMapper: s } = r, i = ht(r, r.table.core.schema);
        return r.table.core.query({ trans: n, limit: r.limit, values: !0, query: { index: i, range: r.range } }).then(({ result: o }) => s ? o.map(s) : o);
      }
      {
        const s = [];
        return Ze(r, (i) => s.push(i), n, r.table.core).then(() => s);
      }
    }, e);
  }
  offset(e) {
    var n = this._ctx;
    return e <= 0 || (n.offset += e, we(n) ? At(n, () => {
      var r = e;
      return (s, i) => r === 0 || (r === 1 ? (--r, !1) : (i(() => {
        s.advance(r), r = 0;
      }), !1));
    }) : At(n, () => {
      var r = e;
      return () => --r < 0;
    })), this;
  }
  limit(e) {
    return this._ctx.limit = Math.min(this._ctx.limit, e), At(this._ctx, () => {
      var n = e;
      return function(r, s, i) {
        return --n <= 0 && s(i), n >= 0;
      };
    }, !0), this;
  }
  until(e, n) {
    return Nt(this._ctx, function(r, s, i) {
      return !e(r.value) || (s(i), n);
    }), this;
  }
  first(e) {
    return this.limit(1).toArray(function(n) {
      return n[0];
    }).then(e);
  }
  last(e) {
    return this.reverse().first(e);
  }
  filter(e) {
    var n, r;
    return Nt(this._ctx, function(s) {
      return e(s.value);
    }), n = this._ctx, r = e, n.isMatch = me(n.isMatch, r), this;
  }
  and(e) {
    return this.filter(e);
  }
  or(e) {
    return new this.db.WhereClause(this._ctx.table, e, this);
  }
  reverse() {
    return this._ctx.dir = this._ctx.dir === "prev" ? "next" : "prev", this._ondirectionchange && this._ondirectionchange(this._ctx.dir), this;
  }
  desc() {
    return this.reverse();
  }
  eachKey(e) {
    var n = this._ctx;
    return n.keysOnly = !n.isMatch, this.each(function(r, s) {
      e(s.key, s);
    });
  }
  eachUniqueKey(e) {
    return this._ctx.unique = "unique", this.eachKey(e);
  }
  eachPrimaryKey(e) {
    var n = this._ctx;
    return n.keysOnly = !n.isMatch, this.each(function(r, s) {
      e(s.primaryKey, s);
    });
  }
  keys(e) {
    var n = this._ctx;
    n.keysOnly = !n.isMatch;
    var r = [];
    return this.each(function(s, i) {
      r.push(i.key);
    }).then(function() {
      return r;
    }).then(e);
  }
  primaryKeys(e) {
    var n = this._ctx;
    if (n.dir === "next" && we(n, !0) && n.limit > 0) return this._read((s) => {
      var i = ht(n, n.table.core.schema);
      return n.table.core.query({ trans: s, values: !1, limit: n.limit, query: { index: i, range: n.range } });
    }).then(({ result: s }) => s).then(e);
    n.keysOnly = !n.isMatch;
    var r = [];
    return this.each(function(s, i) {
      r.push(i.primaryKey);
    }).then(function() {
      return r;
    }).then(e);
  }
  uniqueKeys(e) {
    return this._ctx.unique = "unique", this.keys(e);
  }
  firstKey(e) {
    return this.limit(1).keys(function(n) {
      return n[0];
    }).then(e);
  }
  lastKey(e) {
    return this.reverse().firstKey(e);
  }
  distinct() {
    var e = this._ctx, n = e.index && e.table.schema.idxByName[e.index];
    if (!n || !n.multi) return this;
    var r = {};
    return Nt(this._ctx, function(s) {
      var i = s.primaryKey.toString(), o = V(r, i);
      return r[i] = !0, !o;
    }), this;
  }
  modify(e) {
    var n = this._ctx;
    return this._write((r) => {
      var s;
      if (typeof e == "function") s = e;
      else {
        var i = j(e), o = i.length;
        s = function(p) {
          for (var b = !1, y = 0; y < o; ++y) {
            var m = i[y], w = e[m];
            te(p, m) !== w && (W(p, m, w), b = !0);
          }
          return b;
        };
      }
      const a = n.table.core, { outbound: c, extractKey: h } = a.schema.primaryKey, u = this.db._options.modifyChunkSize || 200, d = [];
      let l = 0;
      const f = [], g = (p, b) => {
        const { failures: y, numFailures: m } = b;
        l += p - m;
        for (let w of j(y)) d.push(y[w]);
      };
      return this.clone().primaryKeys().then((p) => {
        const b = (y) => {
          const m = Math.min(u, p.length - y);
          return a.getMany({ trans: r, keys: p.slice(y, y + m), cache: "immutable" }).then((w) => {
            const x = [], C = [], k = c ? [] : null, v = [];
            for (let _ = 0; _ < m; ++_) {
              const I = w[_], M = { value: Ve(I), primKey: p[y + _] };
              s.call(M, M.value, M) !== !1 && (M.value == null ? v.push(p[y + _]) : c || q(h(I), h(M.value)) === 0 ? (C.push(M.value), c && k.push(p[y + _])) : (v.push(p[y + _]), x.push(M.value)));
            }
            const K = we(n) && n.limit === 1 / 0 && (typeof e != "function" || e === Ot) && { index: n.index, range: n.range };
            return Promise.resolve(x.length > 0 && a.mutate({ trans: r, type: "add", values: x }).then((_) => {
              for (let I in _.failures) v.splice(parseInt(I), 1);
              g(x.length, _);
            })).then(() => (C.length > 0 || K && typeof e == "object") && a.mutate({ trans: r, type: "put", keys: k, values: C, criteria: K, changeSpec: typeof e != "function" && e }).then((_) => g(C.length, _))).then(() => (v.length > 0 || K && e === Ot) && a.mutate({ trans: r, type: "delete", keys: v, criteria: K }).then((_) => g(v.length, _))).then(() => p.length > y + m && b(y + u));
          });
        };
        return b(0).then(() => {
          if (d.length > 0) throw new pt("Error modifying one or more objects", d, l, f);
          return p.length;
        });
      });
    });
  }
  delete() {
    var e = this._ctx, n = e.range;
    return we(e) && (e.isPrimKey && !Jr || n.type === 3) ? this._write((r) => {
      const { primaryKey: s } = e.table.core.schema, i = n;
      return e.table.core.count({ trans: r, query: { index: s, range: i } }).then((o) => e.table.core.mutate({ trans: r, type: "deleteRange", range: i }).then(({ failures: a, lastResult: c, results: h, numFailures: u }) => {
        if (u) throw new pt("Could not delete some values", Object.keys(a).map((d) => a[d]), o - u);
        return o - u;
      }));
    }) : this.modify(Ot);
  }
}
const Ot = (t, e) => e.value = null;
function Zr(t, e) {
  return t < e ? -1 : t === e ? 0 : 1;
}
function es(t, e) {
  return t > e ? -1 : t === e ? 0 : 1;
}
function U(t, e, n) {
  var r = t instanceof ur ? new t.Collection(t) : t;
  return r._ctx.error = n ? new n(e) : new TypeError(e), r;
}
function _e(t) {
  return new t.Collection(t, () => cr("")).limit(0);
}
function ts(t, e, n, r, s, i) {
  for (var o = Math.min(t.length, r.length), a = -1, c = 0; c < o; ++c) {
    var h = e[c];
    if (h !== r[c]) return s(t[c], n[c]) < 0 ? t.substr(0, c) + n[c] + n.substr(c + 1) : s(t[c], r[c]) < 0 ? t.substr(0, c) + r[c] + n.substr(c + 1) : a >= 0 ? t.substr(0, a) + e[a] + n.substr(a + 1) : null;
    s(t[c], h) < 0 && (a = c);
  }
  return o < r.length && i === "next" ? t + n.substr(t.length) : o < t.length && i === "prev" ? t.substr(0, n.length) : a < 0 ? null : t.substr(0, a) + r[a] + n.substr(a + 1);
}
function et(t, e, n, r) {
  var s, i, o, a, c, h, u, d = n.length;
  if (!n.every((p) => typeof p == "string")) return U(t, ir);
  function l(p) {
    s = /* @__PURE__ */ function(y) {
      return y === "next" ? (m) => m.toUpperCase() : (m) => m.toLowerCase();
    }(p), i = /* @__PURE__ */ function(y) {
      return y === "next" ? (m) => m.toLowerCase() : (m) => m.toUpperCase();
    }(p), o = p === "next" ? Zr : es;
    var b = n.map(function(y) {
      return { lower: i(y), upper: s(y) };
    }).sort(function(y, m) {
      return o(y.lower, m.lower);
    });
    a = b.map(function(y) {
      return y.upper;
    }), c = b.map(function(y) {
      return y.lower;
    }), h = p, u = p === "next" ? "" : r;
  }
  l("next");
  var f = new t.Collection(t, () => re(a[0], c[d - 1] + r));
  f._ondirectionchange = function(p) {
    l(p);
  };
  var g = 0;
  return f._addAlgorithm(function(p, b, y) {
    var m = p.key;
    if (typeof m != "string") return !1;
    var w = i(m);
    if (e(w, c, g)) return !0;
    for (var x = null, C = g; C < d; ++C) {
      var k = ts(m, w, a[C], c[C], o, h);
      k === null && x === null ? g = C + 1 : (x === null || o(x, k) > 0) && (x = k);
    }
    return b(x !== null ? function() {
      p.continue(x + u);
    } : y), !1;
  }), f;
}
function re(t, e, n, r) {
  return { type: 2, lower: t, upper: e, lowerOpen: n, upperOpen: r };
}
function cr(t) {
  return { type: 1, lower: t, upper: t };
}
class ur {
  get Collection() {
    return this._ctx.table.db.Collection;
  }
  between(e, n, r, s) {
    r = r !== !1, s = s === !0;
    try {
      return this._cmp(e, n) > 0 || this._cmp(e, n) === 0 && (r || s) && (!r || !s) ? _e(this) : new this.Collection(this, () => re(e, n, !r, !s));
    } catch {
      return U(this, J);
    }
  }
  equals(e) {
    return e == null ? U(this, J) : new this.Collection(this, () => cr(e));
  }
  above(e) {
    return e == null ? U(this, J) : new this.Collection(this, () => re(e, void 0, !0));
  }
  aboveOrEqual(e) {
    return e == null ? U(this, J) : new this.Collection(this, () => re(e, void 0, !1));
  }
  below(e) {
    return e == null ? U(this, J) : new this.Collection(this, () => re(void 0, e, !1, !0));
  }
  belowOrEqual(e) {
    return e == null ? U(this, J) : new this.Collection(this, () => re(void 0, e));
  }
  startsWith(e) {
    return typeof e != "string" ? U(this, ir) : this.between(e, e + he, !0, !0);
  }
  startsWithIgnoreCase(e) {
    return e === "" ? this.startsWith(e) : et(this, (n, r) => n.indexOf(r[0]) === 0, [e], he);
  }
  equalsIgnoreCase(e) {
    return et(this, (n, r) => n === r[0], [e], "");
  }
  anyOfIgnoreCase() {
    var e = X.apply(xe, arguments);
    return e.length === 0 ? _e(this) : et(this, (n, r) => r.indexOf(n) !== -1, e, "");
  }
  startsWithAnyOfIgnoreCase() {
    var e = X.apply(xe, arguments);
    return e.length === 0 ? _e(this) : et(this, (n, r) => r.some((s) => n.indexOf(s) === 0), e, he);
  }
  anyOf() {
    const e = X.apply(xe, arguments);
    let n = this._cmp;
    try {
      e.sort(n);
    } catch {
      return U(this, J);
    }
    if (e.length === 0) return _e(this);
    const r = new this.Collection(this, () => re(e[0], e[e.length - 1]));
    r._ondirectionchange = (i) => {
      n = i === "next" ? this._ascending : this._descending, e.sort(n);
    };
    let s = 0;
    return r._addAlgorithm((i, o, a) => {
      const c = i.key;
      for (; n(c, e[s]) > 0; ) if (++s, s === e.length) return o(a), !1;
      return n(c, e[s]) === 0 || (o(() => {
        i.continue(e[s]);
      }), !1);
    }), r;
  }
  notEqual(e) {
    return this.inAnyRange([[Yt, e], [e, this.db._maxKey]], { includeLowers: !1, includeUppers: !1 });
  }
  noneOf() {
    const e = X.apply(xe, arguments);
    if (e.length === 0) return new this.Collection(this);
    try {
      e.sort(this._ascending);
    } catch {
      return U(this, J);
    }
    const n = e.reduce((r, s) => r ? r.concat([[r[r.length - 1][1], s]]) : [[Yt, s]], null);
    return n.push([e[e.length - 1], this.db._maxKey]), this.inAnyRange(n, { includeLowers: !1, includeUppers: !1 });
  }
  inAnyRange(e, n) {
    const r = this._cmp, s = this._ascending, i = this._descending, o = this._min, a = this._max;
    if (e.length === 0) return _e(this);
    if (!e.every((m) => m[0] !== void 0 && m[1] !== void 0 && s(m[0], m[1]) <= 0)) return U(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", S.InvalidArgument);
    const c = !n || n.includeLowers !== !1, h = n && n.includeUppers === !0;
    let u, d = s;
    function l(m, w) {
      return d(m[0], w[0]);
    }
    try {
      u = e.reduce(function(m, w) {
        let x = 0, C = m.length;
        for (; x < C; ++x) {
          const k = m[x];
          if (r(w[0], k[1]) < 0 && r(w[1], k[0]) > 0) {
            k[0] = o(k[0], w[0]), k[1] = a(k[1], w[1]);
            break;
          }
        }
        return x === C && m.push(w), m;
      }, []), u.sort(l);
    } catch {
      return U(this, J);
    }
    let f = 0;
    const g = h ? (m) => s(m, u[f][1]) > 0 : (m) => s(m, u[f][1]) >= 0, p = c ? (m) => i(m, u[f][0]) > 0 : (m) => i(m, u[f][0]) >= 0;
    let b = g;
    const y = new this.Collection(this, () => re(u[0][0], u[u.length - 1][1], !c, !h));
    return y._ondirectionchange = (m) => {
      m === "next" ? (b = g, d = s) : (b = p, d = i), u.sort(l);
    }, y._addAlgorithm((m, w, x) => {
      for (var C = m.key; b(C); ) if (++f, f === u.length) return w(x), !1;
      return !!function(k) {
        return !g(k) && !p(k);
      }(C) || (this._cmp(C, u[f][1]) === 0 || this._cmp(C, u[f][0]) === 0 || w(() => {
        d === s ? m.continue(u[f][0]) : m.continue(u[f][1]);
      }), !1);
    }), y;
  }
  startsWithAnyOf() {
    const e = X.apply(xe, arguments);
    return e.every((n) => typeof n == "string") ? e.length === 0 ? _e(this) : this.inAnyRange(e.map((n) => [n, n + he])) : U(this, "startsWithAnyOf() only works with strings");
  }
}
function G(t) {
  return O(function(e) {
    return qe(e), t(e.target.error), !1;
  });
}
function qe(t) {
  t.stopPropagation && t.stopPropagation(), t.preventDefault && t.preventDefault();
}
const $e = "storagemutated", ie = "x-storagemutated-1", ce = Re(null, $e);
class ns {
  _lock() {
    return Ae(!E.global), ++this._reculock, this._reculock !== 1 || E.global || (E.lockOwnerFor = this), this;
  }
  _unlock() {
    if (Ae(!E.global), --this._reculock == 0) for (E.global || (E.lockOwnerFor = null); this._blockedFuncs.length > 0 && !this._locked(); ) {
      var e = this._blockedFuncs.shift();
      try {
        Ke(e[1], e[0]);
      } catch {
      }
    }
    return this;
  }
  _locked() {
    return this._reculock && E.lockOwnerFor !== this;
  }
  create(e) {
    if (!this.mode) return this;
    const n = this.db.idbdb, r = this.db._state.dbOpenError;
    if (Ae(!this.idbtrans), !e && !n) switch (r && r.name) {
      case "DatabaseClosedError":
        throw new S.DatabaseClosed(r);
      case "MissingAPIError":
        throw new S.MissingAPI(r.message, r);
      default:
        throw new S.OpenFailed(r);
    }
    if (!this.active) throw new S.TransactionInactive();
    return Ae(this._completion._state === null), (e = this.idbtrans = e || (this.db.core ? this.db.core.transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability }) : n.transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability }))).onerror = O((s) => {
      qe(s), this._reject(e.error);
    }), e.onabort = O((s) => {
      qe(s), this.active && this._reject(new S.Abort(e.error)), this.active = !1, this.on("abort").fire(s);
    }), e.oncomplete = O(() => {
      this.active = !1, this._resolve(), "mutatedParts" in e && ce.storagemutated.fire(e.mutatedParts);
    }), this;
  }
  _promise(e, n, r) {
    if (e === "readwrite" && this.mode !== "readwrite") return R(new S.ReadOnly("Transaction is readonly"));
    if (!this.active) return R(new S.TransactionInactive());
    if (this._locked()) return new P((i, o) => {
      this._blockedFuncs.push([() => {
        this._promise(e, n, r).then(i, o);
      }, E]);
    });
    if (r) return oe(() => {
      var i = new P((o, a) => {
        this._lock();
        const c = n(o, a, this);
        c && c.then && c.then(o, a);
      });
      return i.finally(() => this._unlock()), i._lib = !0, i;
    });
    var s = new P((i, o) => {
      var a = n(i, o, this);
      a && a.then && a.then(i, o);
    });
    return s._lib = !0, s;
  }
  _root() {
    return this.parent ? this.parent._root() : this;
  }
  waitFor(e) {
    var n = this._root();
    const r = P.resolve(e);
    if (n._waitingFor) n._waitingFor = n._waitingFor.then(() => r);
    else {
      n._waitingFor = r, n._waitingQueue = [];
      var s = n.idbtrans.objectStore(n.storeNames[0]);
      (function o() {
        for (++n._spinCount; n._waitingQueue.length; ) n._waitingQueue.shift()();
        n._waitingFor && (s.get(-1 / 0).onsuccess = o);
      })();
    }
    var i = n._waitingFor;
    return new P((o, a) => {
      r.then((c) => n._waitingQueue.push(O(o.bind(null, c))), (c) => n._waitingQueue.push(O(a.bind(null, c)))).finally(() => {
        n._waitingFor === i && (n._waitingFor = null);
      });
    });
  }
  abort() {
    this.active && (this.active = !1, this.idbtrans && this.idbtrans.abort(), this._reject(new S.Abort()));
  }
  table(e) {
    const n = this._memoizedTables || (this._memoizedTables = {});
    if (V(n, e)) return n[e];
    const r = this.schema[e];
    if (!r) throw new S.NotFound("Table " + e + " not part of transaction");
    const s = new this.db.Table(e, r, this);
    return s.core = this.db.core.table(e), n[e] = s, s;
  }
}
function Jt(t, e, n, r, s, i, o) {
  return { name: t, keyPath: e, unique: n, multi: r, auto: s, compound: i, src: (n && !o ? "&" : "") + (r ? "*" : "") + (s ? "++" : "") + lr(e) };
}
function lr(t) {
  return typeof t == "string" ? t : t ? "[" + [].join.call(t, "+") + "]" : "";
}
function hr(t, e, n) {
  return { name: t, primKey: e, indexes: n, mappedClass: null, idxByName: qn(n, (r) => [r.name, r]) };
}
let He = (t) => {
  try {
    return t.only([[]]), He = () => [[]], [[]];
  } catch {
    return He = () => he, he;
  }
};
function Qt(t) {
  return t == null ? () => {
  } : typeof t == "string" ? function(e) {
    return e.split(".").length === 1 ? (r) => r[e] : (r) => te(r, e);
  }(t) : (e) => te(e, t);
}
function An(t) {
  return [].slice.call(t);
}
let rs = 0;
function Be(t) {
  return t == null ? ":id" : typeof t == "string" ? t : `[${t.join("+")}]`;
}
function ss(t, e, n) {
  function r(c) {
    if (c.type === 3) return null;
    if (c.type === 4) throw new Error("Cannot convert never type to IDBKeyRange");
    const { lower: h, upper: u, lowerOpen: d, upperOpen: l } = c;
    return h === void 0 ? u === void 0 ? null : e.upperBound(u, !!l) : u === void 0 ? e.lowerBound(h, !!d) : e.bound(h, u, !!d, !!l);
  }
  const { schema: s, hasGetAll: i } = function(c, h) {
    const u = An(c.objectStoreNames);
    return { schema: { name: c.name, tables: u.map((d) => h.objectStore(d)).map((d) => {
      const { keyPath: l, autoIncrement: f } = d, g = L(l), p = l == null, b = {}, y = { name: d.name, primaryKey: { name: null, isPrimaryKey: !0, outbound: p, compound: g, keyPath: l, autoIncrement: f, unique: !0, extractKey: Qt(l) }, indexes: An(d.indexNames).map((m) => d.index(m)).map((m) => {
        const { name: w, unique: x, multiEntry: C, keyPath: k } = m, v = { name: w, compound: L(k), keyPath: k, unique: x, multiEntry: C, extractKey: Qt(k) };
        return b[Be(k)] = v, v;
      }), getIndexByKeyPath: (m) => b[Be(m)] };
      return b[":id"] = y.primaryKey, l != null && (b[Be(l)] = y.primaryKey), y;
    }) }, hasGetAll: u.length > 0 && "getAll" in h.objectStore(u[0]) && !(typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) };
  }(t, n), o = s.tables.map((c) => function(h) {
    const u = h.name;
    return { name: u, schema: h, mutate: function({ trans: d, type: l, keys: f, values: g, range: p }) {
      return new Promise((b, y) => {
        b = O(b);
        const m = d.objectStore(u), w = m.keyPath == null, x = l === "put" || l === "add";
        if (!x && l !== "delete" && l !== "deleteRange") throw new Error("Invalid operation type: " + l);
        const { length: C } = f || g || { length: 1 };
        if (f && g && f.length !== g.length) throw new Error("Given keys array must have same length as given values array.");
        if (C === 0) return b({ numFailures: 0, failures: {}, results: [], lastResult: void 0 });
        let k;
        const v = [], K = [];
        let _ = 0;
        const I = (z) => {
          ++_, qe(z);
        };
        if (l === "deleteRange") {
          if (p.type === 4) return b({ numFailures: _, failures: K, results: [], lastResult: void 0 });
          p.type === 3 ? v.push(k = m.clear()) : v.push(k = m.delete(r(p)));
        } else {
          const [z, B] = x ? w ? [g, f] : [g, null] : [f, null];
          if (x) for (let T = 0; T < C; ++T) v.push(k = B && B[T] !== void 0 ? m[l](z[T], B[T]) : m[l](z[T])), k.onerror = I;
          else for (let T = 0; T < C; ++T) v.push(k = m[l](z[T])), k.onerror = I;
        }
        const M = (z) => {
          const B = z.target.result;
          v.forEach((T, be) => T.error != null && (K[be] = T.error)), b({ numFailures: _, failures: K, results: l === "delete" ? f : v.map((T) => T.result), lastResult: B });
        };
        k.onerror = (z) => {
          I(z), M(z);
        }, k.onsuccess = M;
      });
    }, getMany: ({ trans: d, keys: l }) => new Promise((f, g) => {
      f = O(f);
      const p = d.objectStore(u), b = l.length, y = new Array(b);
      let m, w = 0, x = 0;
      const C = (v) => {
        const K = v.target;
        y[K._pos] = K.result, ++x === w && f(y);
      }, k = G(g);
      for (let v = 0; v < b; ++v) l[v] != null && (m = p.get(l[v]), m._pos = v, m.onsuccess = C, m.onerror = k, ++w);
      w === 0 && f(y);
    }), get: ({ trans: d, key: l }) => new Promise((f, g) => {
      f = O(f);
      const p = d.objectStore(u).get(l);
      p.onsuccess = (b) => f(b.target.result), p.onerror = G(g);
    }), query: /* @__PURE__ */ function(d) {
      return (l) => new Promise((f, g) => {
        f = O(f);
        const { trans: p, values: b, limit: y, query: m } = l, w = y === 1 / 0 ? void 0 : y, { index: x, range: C } = m, k = p.objectStore(u), v = x.isPrimaryKey ? k : k.index(x.name), K = r(C);
        if (y === 0) return f({ result: [] });
        if (d) {
          const _ = b ? v.getAll(K, w) : v.getAllKeys(K, w);
          _.onsuccess = (I) => f({ result: I.target.result }), _.onerror = G(g);
        } else {
          let _ = 0;
          const I = b || !("openKeyCursor" in v) ? v.openCursor(K) : v.openKeyCursor(K), M = [];
          I.onsuccess = (z) => {
            const B = I.result;
            return B ? (M.push(b ? B.value : B.primaryKey), ++_ === y ? f({ result: M }) : void B.continue()) : f({ result: M });
          }, I.onerror = G(g);
        }
      });
    }(i), openCursor: function({ trans: d, values: l, query: f, reverse: g, unique: p }) {
      return new Promise((b, y) => {
        b = O(b);
        const { index: m, range: w } = f, x = d.objectStore(u), C = m.isPrimaryKey ? x : x.index(m.name), k = g ? p ? "prevunique" : "prev" : p ? "nextunique" : "next", v = l || !("openKeyCursor" in C) ? C.openCursor(r(w), k) : C.openKeyCursor(r(w), k);
        v.onerror = G(y), v.onsuccess = O((K) => {
          const _ = v.result;
          if (!_) return void b(null);
          _.___id = ++rs, _.done = !1;
          const I = _.continue.bind(_);
          let M = _.continuePrimaryKey;
          M && (M = M.bind(_));
          const z = _.advance.bind(_), B = () => {
            throw new Error("Cursor not stopped");
          };
          _.trans = d, _.stop = _.continue = _.continuePrimaryKey = _.advance = () => {
            throw new Error("Cursor not started");
          }, _.fail = O(y), _.next = function() {
            let T = 1;
            return this.start(() => T-- ? this.continue() : this.stop()).then(() => this);
          }, _.start = (T) => {
            const be = new Promise((H, ue) => {
              H = O(H), v.onerror = G(ue), _.fail = ue, _.stop = (De) => {
                _.stop = _.continue = _.continuePrimaryKey = _.advance = B, H(De);
              };
            }), ve = () => {
              if (v.result) try {
                T();
              } catch (H) {
                _.fail(H);
              }
              else _.done = !0, _.start = () => {
                throw new Error("Cursor behind last entry");
              }, _.stop();
            };
            return v.onsuccess = O((H) => {
              v.onsuccess = ve, ve();
            }), _.continue = I, _.continuePrimaryKey = M, _.advance = z, ve(), be;
          }, b(_);
        }, y);
      });
    }, count({ query: d, trans: l }) {
      const { index: f, range: g } = d;
      return new Promise((p, b) => {
        const y = l.objectStore(u), m = f.isPrimaryKey ? y : y.index(f.name), w = r(g), x = w ? m.count(w) : m.count();
        x.onsuccess = O((C) => p(C.target.result)), x.onerror = G(b);
      });
    } };
  }(c)), a = {};
  return o.forEach((c) => a[c.name] = c), { stack: "dbcore", transaction: t.transaction.bind(t), table(c) {
    if (!a[c]) throw new Error(`Table '${c}' not found`);
    return a[c];
  }, MIN_KEY: -1 / 0, MAX_KEY: He(e), schema: s };
}
function Xt({ _novip: t }, e) {
  const n = e.db, r = function(s, i, { IDBKeyRange: o, indexedDB: a }, c) {
    return { dbcore: function(u, d) {
      return d.reduce((l, { create: f }) => ({ ...l, ...f(l) }), u);
    }(ss(i, o, c), s.dbcore) };
  }(t._middlewares, n, t._deps, e);
  t.core = r.dbcore, t.tables.forEach((s) => {
    const i = s.name;
    t.core.schema.tables.some((o) => o.name === i) && (s.core = t.core.table(i), t[i] instanceof t.Table && (t[i].core = s.core));
  });
}
function vt({ _novip: t }, e, n, r) {
  n.forEach((s) => {
    const i = r[s];
    e.forEach((o) => {
      const a = un(o, s);
      (!a || "value" in a && a.value === void 0) && (o === t.Transaction.prototype || o instanceof t.Transaction ? ee(o, s, { get() {
        return this.table(s);
      }, set(c) {
        Fn(this, s, { value: c, writable: !0, configurable: !0, enumerable: !0 });
      } }) : o[s] = new t.Table(s, i));
    });
  });
}
function Zt({ _novip: t }, e) {
  e.forEach((n) => {
    for (let r in n) n[r] instanceof t.Table && delete n[r];
  });
}
function is(t, e) {
  return t._cfg.version - e._cfg.version;
}
function os(t, e, n, r) {
  const s = t._dbSchema, i = t._createTransaction("readwrite", t._storeNames, s);
  i.create(n), i._completion.catch(r);
  const o = i._reject.bind(i), a = E.transless || E;
  oe(() => {
    E.trans = i, E.transless = a, e === 0 ? (j(s).forEach((c) => {
      It(n, c, s[c].primKey, s[c].indexes);
    }), Xt(t, n), P.follow(() => t.on.populate.fire(i)).catch(o)) : function({ _novip: c }, h, u, d) {
      const l = [], f = c._versions;
      let g = c._dbSchema = tn(c, c.idbdb, d), p = !1;
      const b = f.filter((m) => m._cfg.version >= h);
      function y() {
        return l.length ? P.resolve(l.shift()(u.idbtrans)).then(y) : P.resolve();
      }
      return b.forEach((m) => {
        l.push(() => {
          const w = g, x = m._cfg.dbschema;
          nn(c, w, d), nn(c, x, d), g = c._dbSchema = x;
          const C = dr(w, x);
          C.add.forEach((v) => {
            It(d, v[0], v[1].primKey, v[1].indexes);
          }), C.change.forEach((v) => {
            if (v.recreate) throw new S.Upgrade("Not yet support for changing primary key");
            {
              const K = d.objectStore(v.name);
              v.add.forEach((_) => en(K, _)), v.change.forEach((_) => {
                K.deleteIndex(_.name), en(K, _);
              }), v.del.forEach((_) => K.deleteIndex(_));
            }
          });
          const k = m._cfg.contentUpgrade;
          if (k && m._cfg.version > h) {
            Xt(c, d), u._memoizedTables = {}, p = !0;
            let v = $n(x);
            C.del.forEach((M) => {
              v[M] = w[M];
            }), Zt(c, [c.Transaction.prototype]), vt(c, [c.Transaction.prototype], j(v), v), u.schema = v;
            const K = ln(k);
            let _;
            K && Se();
            const I = P.follow(() => {
              if (_ = k(u), _ && K) {
                var M = ne.bind(null, null);
                _.then(M, M);
              }
            });
            return _ && typeof _.then == "function" ? P.resolve(_) : I.then(() => _);
          }
        }), l.push((w) => {
          (!p || !Yr) && function(x, C) {
            [].slice.call(C.db.objectStoreNames).forEach((k) => x[k] == null && C.db.deleteObjectStore(k));
          }(m._cfg.dbschema, w), Zt(c, [c.Transaction.prototype]), vt(c, [c.Transaction.prototype], c._storeNames, c._dbSchema), u.schema = c._dbSchema;
        });
      }), y().then(() => {
        var m, w;
        w = d, j(m = g).forEach((x) => {
          w.db.objectStoreNames.contains(x) || It(w, x, m[x].primKey, m[x].indexes);
        });
      });
    }(t, e, i, n).catch(o);
  });
}
function dr(t, e) {
  const n = { del: [], add: [], change: [] };
  let r;
  for (r in t) e[r] || n.del.push(r);
  for (r in e) {
    const s = t[r], i = e[r];
    if (s) {
      const o = { name: r, def: i, recreate: !1, del: [], add: [], change: [] };
      if ("" + (s.primKey.keyPath || "") != "" + (i.primKey.keyPath || "") || s.primKey.auto !== i.primKey.auto && !_t) o.recreate = !0, n.change.push(o);
      else {
        const a = s.idxByName, c = i.idxByName;
        let h;
        for (h in a) c[h] || o.del.push(h);
        for (h in c) {
          const u = a[h], d = c[h];
          u ? u.src !== d.src && o.change.push(d) : o.add.push(d);
        }
        (o.del.length > 0 || o.add.length > 0 || o.change.length > 0) && n.change.push(o);
      }
    } else n.add.push([r, i]);
  }
  return n;
}
function It(t, e, n, r) {
  const s = t.db.createObjectStore(e, n.keyPath ? { keyPath: n.keyPath, autoIncrement: n.auto } : { autoIncrement: n.auto });
  return r.forEach((i) => en(s, i)), s;
}
function en(t, e) {
  t.createIndex(e.name, e.keyPath, { unique: e.unique, multiEntry: e.multi });
}
function tn(t, e, n) {
  const r = {};
  return ft(e.objectStoreNames, 0).forEach((s) => {
    const i = n.objectStore(s);
    let o = i.keyPath;
    const a = Jt(lr(o), o || "", !1, !1, !!i.autoIncrement, o && typeof o != "string", !0), c = [];
    for (let u = 0; u < i.indexNames.length; ++u) {
      const d = i.index(i.indexNames[u]);
      o = d.keyPath;
      var h = Jt(d.name, o, !!d.unique, !!d.multiEntry, !1, o && typeof o != "string", !1);
      c.push(h);
    }
    r[s] = hr(s, a, c);
  }), r;
}
function nn({ _novip: t }, e, n) {
  const r = n.db.objectStoreNames;
  for (let s = 0; s < r.length; ++s) {
    const i = r[s], o = n.objectStore(i);
    t._hasGetAll = "getAll" in o;
    for (let a = 0; a < o.indexNames.length; ++a) {
      const c = o.indexNames[a], h = o.index(c).keyPath, u = typeof h == "string" ? h : "[" + ft(h).join("+") + "]";
      if (e[i]) {
        const d = e[i].idxByName[u];
        d && (d.name = c, delete e[i].idxByName[u], e[i].idxByName[c] = d);
      }
    }
  }
  typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && A.WorkerGlobalScope && A instanceof A.WorkerGlobalScope && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604 && (t._hasGetAll = !1);
}
class as {
  _parseStoresSpec(e, n) {
    j(e).forEach((r) => {
      if (e[r] !== null) {
        var s = e[r].split(",").map((o, a) => {
          const c = (o = o.trim()).replace(/([&*]|\+\+)/g, ""), h = /^\[/.test(c) ? c.match(/^\[(.*)\]$/)[1].split("+") : c;
          return Jt(c, h || null, /\&/.test(o), /\*/.test(o), /\+\+/.test(o), L(h), a === 0);
        }), i = s.shift();
        if (i.multi) throw new S.Schema("Primary key cannot be multi-valued");
        s.forEach((o) => {
          if (o.auto) throw new S.Schema("Only primary key can be marked as autoIncrement (++)");
          if (!o.keyPath) throw new S.Schema("Index must have a name and cannot be an empty string");
        }), n[r] = hr(r, i, s);
      }
    });
  }
  stores(e) {
    const n = this.db;
    this._cfg.storesSource = this._cfg.storesSource ? $(this._cfg.storesSource, e) : e;
    const r = n._versions, s = {};
    let i = {};
    return r.forEach((o) => {
      $(s, o._cfg.storesSource), i = o._cfg.dbschema = {}, o._parseStoresSpec(s, i);
    }), n._dbSchema = i, Zt(n, [n._allTables, n, n.Transaction.prototype]), vt(n, [n._allTables, n, n.Transaction.prototype, this._cfg.tables], j(i), i), n._storeNames = j(i), this;
  }
  upgrade(e) {
    return this._cfg.contentUpgrade = fn(this._cfg.contentUpgrade || N, e), this;
  }
}
function gn(t, e) {
  let n = t._dbNamesDB;
  return n || (n = t._dbNamesDB = new pe(xt, { addons: [], indexedDB: t, IDBKeyRange: e }), n.version(1).stores({ dbnames: "name" })), n.table("dbnames");
}
function bn(t) {
  return t && typeof t.databases == "function";
}
function rn(t) {
  return oe(function() {
    return E.letThrough = !0, t();
  });
}
function cs() {
  var t;
  return !navigator.userAgentData && /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent) && indexedDB.databases ? new Promise(function(e) {
    var n = function() {
      return indexedDB.databases().finally(e);
    };
    t = setInterval(n, 100), n();
  }).finally(function() {
    return clearInterval(t);
  }) : Promise.resolve();
}
function us(t) {
  const e = t._state, { indexedDB: n } = t._deps;
  if (e.isBeingOpened || t.idbdb) return e.dbReadyPromise.then(() => e.dbOpenError ? R(e.dbOpenError) : t);
  Y && (e.openCanceller._stackHolder = ge()), e.isBeingOpened = !0, e.dbOpenError = null, e.openComplete = !1;
  const r = e.openCanceller;
  function s() {
    if (e.openCanceller !== r) throw new S.DatabaseClosed("db.open() was cancelled");
  }
  let i = e.dbReadyResolve, o = null, a = !1;
  const c = () => new P((h, u) => {
    if (s(), !n) throw new S.MissingAPI();
    const d = t.name, l = e.autoSchema ? n.open(d) : n.open(d, Math.round(10 * t.verno));
    if (!l) throw new S.MissingAPI();
    l.onerror = G(u), l.onblocked = O(t._fireOnBlocked), l.onupgradeneeded = O((f) => {
      if (o = l.transaction, e.autoSchema && !t._options.allowEmptyDB) {
        l.onerror = qe, o.abort(), l.result.close();
        const p = n.deleteDatabase(d);
        p.onsuccess = p.onerror = O(() => {
          u(new S.NoSuchDatabase(`Database ${d} doesnt exist`));
        });
      } else {
        o.onerror = G(u);
        var g = f.oldVersion > Math.pow(2, 62) ? 0 : f.oldVersion;
        a = g < 1, t._novip.idbdb = l.result, os(t, g / 10, o, u);
      }
    }, u), l.onsuccess = O(() => {
      o = null;
      const f = t._novip.idbdb = l.result, g = ft(f.objectStoreNames);
      if (g.length > 0) try {
        const b = f.transaction((p = g).length === 1 ? p[0] : p, "readonly");
        e.autoSchema ? function({ _novip: y }, m, w) {
          y.verno = m.version / 10;
          const x = y._dbSchema = tn(0, m, w);
          y._storeNames = ft(m.objectStoreNames, 0), vt(y, [y._allTables], j(x), x);
        }(t, f, b) : (nn(t, t._dbSchema, b), function(y, m) {
          const w = dr(tn(0, y.idbdb, m), y._dbSchema);
          return !(w.add.length || w.change.some((x) => x.add.length || x.change.length));
        }(t, b) || console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Some queries may fail.")), Xt(t, b);
      } catch {
      }
      var p;
      je.push(t), f.onversionchange = O((b) => {
        e.vcFired = !0, t.on("versionchange").fire(b);
      }), f.onclose = O((b) => {
        t.on("close").fire(b);
      }), a && function({ indexedDB: b, IDBKeyRange: y }, m) {
        !bn(b) && m !== xt && gn(b, y).put({ name: m }).catch(N);
      }(t._deps, d), h();
    }, u);
  }).catch((h) => h && h.name === "UnknownError" && e.PR1398_maxLoop > 0 ? (e.PR1398_maxLoop--, console.warn("Dexie: Workaround for Chrome UnknownError on open()"), c()) : P.reject(h));
  return P.race([r, (typeof navigator > "u" ? P.resolve() : cs()).then(c)]).then(() => (s(), e.onReadyBeingFired = [], P.resolve(rn(() => t.on.ready.fire(t.vip))).then(function h() {
    if (e.onReadyBeingFired.length > 0) {
      let u = e.onReadyBeingFired.reduce(fn, N);
      return e.onReadyBeingFired = [], P.resolve(rn(() => u(t.vip))).then(h);
    }
  }))).finally(() => {
    e.onReadyBeingFired = null, e.isBeingOpened = !1;
  }).then(() => t).catch((h) => {
    e.dbOpenError = h;
    try {
      o && o.abort();
    } catch {
    }
    return r === e.openCanceller && t._close(), R(h);
  }).finally(() => {
    e.openComplete = !0, i();
  });
}
function sn(t) {
  var e = (i) => t.next(i), n = s(e), r = s((i) => t.throw(i));
  function s(i) {
    return (o) => {
      var a = i(o), c = a.value;
      return a.done ? c : c && typeof c.then == "function" ? c.then(n, r) : L(c) ? Promise.all(c).then(n, r) : n(c);
    };
  }
  return s(e)();
}
function ls(t, e, n) {
  var r = arguments.length;
  if (r < 2) throw new S.InvalidArgument("Too few arguments");
  for (var s = new Array(r - 1); --r; ) s[r - 1] = arguments[r];
  return n = s.pop(), [t, Hn(s), n];
}
function fr(t, e, n, r, s) {
  return P.resolve().then(() => {
    const i = E.transless || E, o = t._createTransaction(e, n, t._dbSchema, r), a = { trans: o, transless: i };
    if (r) o.idbtrans = r.idbtrans;
    else try {
      o.create(), t._state.PR1398_maxLoop = 3;
    } catch (d) {
      return d.name === dn.InvalidState && t.isOpen() && --t._state.PR1398_maxLoop > 0 ? (console.warn("Dexie: Need to reopen db"), t._close(), t.open().then(() => fr(t, e, n, null, s))) : R(d);
    }
    const c = ln(s);
    let h;
    c && Se();
    const u = P.follow(() => {
      if (h = s.call(o, o), h) if (c) {
        var d = ne.bind(null, null);
        h.then(d, d);
      } else typeof h.next == "function" && typeof h.throw == "function" && (h = sn(h));
    }, a);
    return (h && typeof h.then == "function" ? P.resolve(h).then((d) => o.active ? d : R(new S.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"))) : u.then(() => h)).then((d) => (r && o._resolve(), o._completion.then(() => d))).catch((d) => (o._reject(d), R(d)));
  });
}
function tt(t, e, n) {
  const r = L(t) ? t.slice() : [t];
  for (let s = 0; s < n; ++s) r.push(e);
  return r;
}
const hs = { stack: "dbcore", name: "VirtualIndexMiddleware", level: 1, create: function(t) {
  return { ...t, table(e) {
    const n = t.table(e), { schema: r } = n, s = {}, i = [];
    function o(u, d, l) {
      const f = Be(u), g = s[f] = s[f] || [], p = u == null ? 0 : typeof u == "string" ? 1 : u.length, b = d > 0, y = { ...l, isVirtual: b, keyTail: d, keyLength: p, extractKey: Qt(u), unique: !b && l.unique };
      return g.push(y), y.isPrimaryKey || i.push(y), p > 1 && o(p === 2 ? u[0] : u.slice(0, p - 1), d + 1, l), g.sort((m, w) => m.keyTail - w.keyTail), y;
    }
    const a = o(r.primaryKey.keyPath, 0, r.primaryKey);
    s[":id"] = [a];
    for (const u of r.indexes) o(u.keyPath, 0, u);
    function c(u) {
      const d = u.query.index;
      return d.isVirtual ? { ...u, query: { index: d, range: (l = u.query.range, f = d.keyTail, { type: l.type === 1 ? 2 : l.type, lower: tt(l.lower, l.lowerOpen ? t.MAX_KEY : t.MIN_KEY, f), lowerOpen: !0, upper: tt(l.upper, l.upperOpen ? t.MIN_KEY : t.MAX_KEY, f), upperOpen: !0 }) } } : u;
      var l, f;
    }
    return { ...n, schema: { ...r, primaryKey: a, indexes: i, getIndexByKeyPath: function(u) {
      const d = s[Be(u)];
      return d && d[0];
    } }, count: (u) => n.count(c(u)), query: (u) => n.query(c(u)), openCursor(u) {
      const { keyTail: d, isVirtual: l, keyLength: f } = u.query.index;
      return l ? n.openCursor(c(u)).then((g) => g && function(p) {
        return Object.create(p, { continue: { value: function(y) {
          y != null ? p.continue(tt(y, u.reverse ? t.MAX_KEY : t.MIN_KEY, d)) : u.unique ? p.continue(p.key.slice(0, f).concat(u.reverse ? t.MIN_KEY : t.MAX_KEY, d)) : p.continue();
        } }, continuePrimaryKey: { value(y, m) {
          p.continuePrimaryKey(tt(y, t.MAX_KEY, d), m);
        } }, primaryKey: { get: () => p.primaryKey }, key: { get() {
          const y = p.key;
          return f === 1 ? y[0] : y.slice(0, f);
        } }, value: { get: () => p.value } });
      }(g)) : n.openCursor(u);
    } };
  } };
} };
function vn(t, e, n, r) {
  return n = n || {}, r = r || "", j(t).forEach((s) => {
    if (V(e, s)) {
      var i = t[s], o = e[s];
      if (typeof i == "object" && typeof o == "object" && i && o) {
        const a = Rt(i);
        a !== Rt(o) ? n[r + s] = e[s] : a === "Object" ? vn(i, o, n, r + s + ".") : i !== o && (n[r + s] = e[s]);
      } else i !== o && (n[r + s] = e[s]);
    } else n[r + s] = void 0;
  }), j(e).forEach((s) => {
    V(t, s) || (n[r + s] = e[s]);
  }), n;
}
const ds = { stack: "dbcore", name: "HooksMiddleware", level: 2, create: (t) => ({ ...t, table(e) {
  const n = t.table(e), { primaryKey: r } = n.schema;
  return { ...n, mutate(i) {
    const o = E.trans, { deleting: a, creating: c, updating: h } = o.table(e).hook;
    switch (i.type) {
      case "add":
        if (c.fire === N) break;
        return o._promise("readwrite", () => u(i), !0);
      case "put":
        if (c.fire === N && h.fire === N) break;
        return o._promise("readwrite", () => u(i), !0);
      case "delete":
        if (a.fire === N) break;
        return o._promise("readwrite", () => u(i), !0);
      case "deleteRange":
        if (a.fire === N) break;
        return o._promise("readwrite", () => function(l) {
          return d(l.trans, l.range, 1e4);
        }(i), !0);
    }
    return n.mutate(i);
    function u(l) {
      const f = E.trans, g = l.keys || function(p, b) {
        return b.type === "delete" ? b.keys : b.keys || b.values.map(p.extractKey);
      }(r, l);
      if (!g) throw new Error("Keys missing");
      return (l = l.type === "add" || l.type === "put" ? { ...l, keys: g } : { ...l }).type !== "delete" && (l.values = [...l.values]), l.keys && (l.keys = [...l.keys]), function(p, b, y) {
        return b.type === "add" ? Promise.resolve([]) : p.getMany({ trans: b.trans, keys: y, cache: "immutable" });
      }(n, l, g).then((p) => {
        const b = g.map((y, m) => {
          const w = p[m], x = { onerror: null, onsuccess: null };
          if (l.type === "delete") a.fire.call(x, y, w, f);
          else if (l.type === "add" || w === void 0) {
            const C = c.fire.call(x, y, l.values[m], f);
            y == null && C != null && (y = C, l.keys[m] = y, r.outbound || W(l.values[m], r.keyPath, y));
          } else {
            const C = vn(w, l.values[m]), k = h.fire.call(x, C, y, w, f);
            if (k) {
              const v = l.values[m];
              Object.keys(k).forEach((K) => {
                V(v, K) ? v[K] = k[K] : W(v, K, k[K]);
              });
            }
          }
          return x;
        });
        return n.mutate(l).then(({ failures: y, results: m, numFailures: w, lastResult: x }) => {
          for (let C = 0; C < g.length; ++C) {
            const k = m ? m[C] : g[C], v = b[C];
            k == null ? v.onerror && v.onerror(y[C]) : v.onsuccess && v.onsuccess(l.type === "put" && p[C] ? l.values[C] : k);
          }
          return { failures: y, results: m, numFailures: w, lastResult: x };
        }).catch((y) => (b.forEach((m) => m.onerror && m.onerror(y)), Promise.reject(y)));
      });
    }
    function d(l, f, g) {
      return n.query({ trans: l, values: !1, query: { index: r, range: f }, limit: g }).then(({ result: p }) => u({ type: "delete", keys: p, trans: l }).then((b) => b.numFailures > 0 ? Promise.reject(b.failures[0]) : p.length < g ? { failures: [], numFailures: 0, lastResult: void 0 } : d(l, { ...f, lower: p[p.length - 1], lowerOpen: !0 }, g)));
    }
  } };
} }) };
function pr(t, e, n) {
  try {
    if (!e || e.keys.length < t.length) return null;
    const r = [];
    for (let s = 0, i = 0; s < e.keys.length && i < t.length; ++s) q(e.keys[s], t[i]) === 0 && (r.push(n ? Ve(e.values[s]) : e.values[s]), ++i);
    return r.length === t.length ? r : null;
  } catch {
    return null;
  }
}
const fs = { stack: "dbcore", level: -1, create: (t) => ({ table: (e) => {
  const n = t.table(e);
  return { ...n, getMany: (r) => {
    if (!r.cache) return n.getMany(r);
    const s = pr(r.keys, r.trans._cache, r.cache === "clone");
    return s ? P.resolve(s) : n.getMany(r).then((i) => (r.trans._cache = { keys: r.keys, values: r.cache === "clone" ? Ve(i) : i }, i));
  }, mutate: (r) => (r.type !== "add" && (r.trans._cache = null), n.mutate(r)) };
} }) };
function wn(t) {
  return !("from" in t);
}
const Q = function(t, e) {
  if (!this) {
    const n = new Q();
    return t && "d" in t && $(n, t), n;
  }
  $(this, arguments.length ? { d: 1, from: t, to: arguments.length > 1 ? e : t } : { d: 0 });
};
function Ue(t, e, n) {
  const r = q(e, n);
  if (isNaN(r)) return;
  if (r > 0) throw RangeError();
  if (wn(t)) return $(t, { from: e, to: n, d: 1 });
  const s = t.l, i = t.r;
  if (q(n, t.from) < 0) return s ? Ue(s, e, n) : t.l = { from: e, to: n, d: 1, l: null, r: null }, On(t);
  if (q(e, t.to) > 0) return i ? Ue(i, e, n) : t.r = { from: e, to: n, d: 1, l: null, r: null }, On(t);
  q(e, t.from) < 0 && (t.from = e, t.l = null, t.d = i ? i.d + 1 : 1), q(n, t.to) > 0 && (t.to = n, t.r = null, t.d = t.l ? t.l.d + 1 : 1);
  const o = !t.r;
  s && !t.l && wt(t, s), i && o && wt(t, i);
}
function wt(t, e) {
  wn(e) || function n(r, { from: s, to: i, l: o, r: a }) {
    Ue(r, s, i), o && n(r, o), a && n(r, a);
  }(t, e);
}
function ps(t, e) {
  const n = on(e);
  let r = n.next();
  if (r.done) return !1;
  let s = r.value;
  const i = on(t);
  let o = i.next(s.from), a = o.value;
  for (; !r.done && !o.done; ) {
    if (q(a.from, s.to) <= 0 && q(a.to, s.from) >= 0) return !0;
    q(s.from, a.from) < 0 ? s = (r = n.next(a.from)).value : a = (o = i.next(s.from)).value;
  }
  return !1;
}
function on(t) {
  let e = wn(t) ? null : { s: 0, n: t };
  return { next(n) {
    const r = arguments.length > 0;
    for (; e; ) switch (e.s) {
      case 0:
        if (e.s = 1, r) for (; e.n.l && q(n, e.n.from) < 0; ) e = { up: e, n: e.n.l, s: 1 };
        else for (; e.n.l; ) e = { up: e, n: e.n.l, s: 1 };
      case 1:
        if (e.s = 2, !r || q(n, e.n.to) <= 0) return { value: e.n, done: !1 };
      case 2:
        if (e.n.r) {
          e.s = 3, e = { up: e, n: e.n.r, s: 0 };
          continue;
        }
      case 3:
        e = e.up;
    }
    return { done: !0 };
  } };
}
function On(t) {
  var e, n;
  const r = (((e = t.r) === null || e === void 0 ? void 0 : e.d) || 0) - (((n = t.l) === null || n === void 0 ? void 0 : n.d) || 0), s = r > 1 ? "r" : r < -1 ? "l" : "";
  if (s) {
    const i = s === "r" ? "l" : "r", o = { ...t }, a = t[s];
    t.from = a.from, t.to = a.to, t[s] = a[s], o[s] = a[i], t[i] = o, o.d = In(o);
  }
  t.d = In(t);
}
function In({ r: t, l: e }) {
  return (t ? e ? Math.max(t.d, e.d) : t.d : e ? e.d : 0) + 1;
}
Ee(Q.prototype, { add(t) {
  return wt(this, t), this;
}, addKey(t) {
  return Ue(this, t, t), this;
}, addKeys(t) {
  return t.forEach((e) => Ue(this, e, e)), this;
}, [Bt]() {
  return on(this);
} });
const ys = { stack: "dbcore", level: 0, create: (t) => {
  const e = t.schema.name, n = new Q(t.MIN_KEY, t.MAX_KEY);
  return { ...t, table: (r) => {
    const s = t.table(r), { schema: i } = s, { primaryKey: o } = i, { extractKey: a, outbound: c } = o, h = { ...s, mutate: (l) => {
      const f = l.trans, g = f.mutatedParts || (f.mutatedParts = {}), p = (k) => {
        const v = `idb://${e}/${r}/${k}`;
        return g[v] || (g[v] = new Q());
      }, b = p(""), y = p(":dels"), { type: m } = l;
      let [w, x] = l.type === "deleteRange" ? [l.range] : l.type === "delete" ? [l.keys] : l.values.length < 50 ? [[], l.values] : [];
      const C = l.trans._cache;
      return s.mutate(l).then((k) => {
        if (L(w)) {
          m !== "delete" && (w = k.results), b.addKeys(w);
          const v = pr(w, C);
          v || m === "add" || y.addKeys(w), (v || x) && function(K, _, I, M) {
            function z(B) {
              const T = K(B.name || "");
              function be(H) {
                return H != null ? B.extractKey(H) : null;
              }
              const ve = (H) => B.multiEntry && L(H) ? H.forEach((ue) => T.addKey(ue)) : T.addKey(H);
              (I || M).forEach((H, ue) => {
                const De = I && be(I[ue]), kt = M && be(M[ue]);
                q(De, kt) !== 0 && (De != null && ve(De), kt != null && ve(kt));
              });
            }
            _.indexes.forEach(z);
          }(p, i, v, x);
        } else if (w) {
          const v = { from: w.lower, to: w.upper };
          y.add(v), b.add(v);
        } else b.add(n), y.add(n), i.indexes.forEach((v) => p(v.name).add(n));
        return k;
      });
    } }, u = ({ query: { index: l, range: f } }) => {
      var g, p;
      return [l, new Q((g = f.lower) !== null && g !== void 0 ? g : t.MIN_KEY, (p = f.upper) !== null && p !== void 0 ? p : t.MAX_KEY)];
    }, d = { get: (l) => [o, new Q(l.key)], getMany: (l) => [o, new Q().addKeys(l.keys)], count: u, query: u, openCursor: u };
    return j(d).forEach((l) => {
      h[l] = function(f) {
        const { subscr: g } = E;
        if (g) {
          const p = (x) => {
            const C = `idb://${e}/${r}/${x}`;
            return g[C] || (g[C] = new Q());
          }, b = p(""), y = p(":dels"), [m, w] = d[l](f);
          if (p(m.name || "").add(w), !m.isPrimaryKey) {
            if (l !== "count") {
              const x = l === "query" && c && f.values && s.query({ ...f, values: !1 });
              return s[l].apply(this, arguments).then((C) => {
                if (l === "query") {
                  if (c && f.values) return x.then(({ result: v }) => (b.addKeys(v), C));
                  const k = f.values ? C.result.map(a) : C.result;
                  f.values ? b.addKeys(k) : y.addKeys(k);
                } else if (l === "openCursor") {
                  const k = C, v = f.values;
                  return k && Object.create(k, { key: { get: () => (y.addKey(k.primaryKey), k.key) }, primaryKey: { get() {
                    const K = k.primaryKey;
                    return y.addKey(K), K;
                  } }, value: { get: () => (v && b.addKey(k.primaryKey), k.value) } });
                }
                return C;
              });
            }
            y.add(n);
          }
        }
        return s[l].apply(this, arguments);
      };
    }), h;
  } };
} };
class pe {
  constructor(e, n) {
    this._middlewares = {}, this.verno = 0;
    const r = pe.dependencies;
    this._options = n = { addons: pe.addons, autoOpen: !0, indexedDB: r.indexedDB, IDBKeyRange: r.IDBKeyRange, ...n }, this._deps = { indexedDB: n.indexedDB, IDBKeyRange: n.IDBKeyRange };
    const { addons: s } = n;
    this._dbSchema = {}, this._versions = [], this._storeNames = [], this._allTables = {}, this.idbdb = null, this._novip = this;
    const i = { dbOpenError: null, isBeingOpened: !1, onReadyBeingFired: null, openComplete: !1, dbReadyResolve: N, dbReadyPromise: null, cancelOpen: N, openCanceller: null, autoSchema: !0, PR1398_maxLoop: 3 };
    var o;
    i.dbReadyPromise = new P((a) => {
      i.dbReadyResolve = a;
    }), i.openCanceller = new P((a, c) => {
      i.cancelOpen = c;
    }), this._state = i, this.name = e, this.on = Re(this, "populate", "blocked", "versionchange", "close", { ready: [fn, N] }), this.on.ready.subscribe = Ln(this.on.ready.subscribe, (a) => (c, h) => {
      pe.vip(() => {
        const u = this._state;
        if (u.openComplete) u.dbOpenError || P.resolve().then(c), h && a(c);
        else if (u.onReadyBeingFired) u.onReadyBeingFired.push(c), h && a(c);
        else {
          a(c);
          const d = this;
          h || a(function l() {
            d.on.ready.unsubscribe(c), d.on.ready.unsubscribe(l);
          });
        }
      });
    }), this.Collection = (o = this, Me(Xr.prototype, function(a, c) {
      this.db = o;
      let h = ar, u = null;
      if (c) try {
        h = c();
      } catch (g) {
        u = g;
      }
      const d = a._ctx, l = d.table, f = l.hook.reading.fire;
      this._ctx = { table: l, index: d.index, isPrimKey: !d.index || l.schema.primKey.keyPath && d.index === l.schema.primKey.name, range: h, keysOnly: !1, dir: "next", unique: "", algorithm: null, filter: null, replayFilter: null, justLimit: !0, isMatch: null, offset: 0, limit: 1 / 0, error: u, or: d.or, valueMapper: f !== Le ? f : null };
    })), this.Table = function(a) {
      return Me(Qr.prototype, function(c, h, u) {
        this.db = a, this._tx = u, this.name = c, this.schema = h, this.hook = a._allTables[c] ? a._allTables[c].hook : Re(null, { creating: [Fr, N], reading: [Br, Le], updating: [zr, N], deleting: [Lr, N] });
      });
    }(this), this.Transaction = function(a) {
      return Me(ns.prototype, function(c, h, u, d, l) {
        this.db = a, this.mode = c, this.storeNames = h, this.schema = u, this.chromeTransactionDurability = d, this.idbtrans = null, this.on = Re(this, "complete", "error", "abort"), this.parent = l || null, this.active = !0, this._reculock = 0, this._blockedFuncs = [], this._resolve = null, this._reject = null, this._waitingFor = null, this._waitingQueue = null, this._spinCount = 0, this._completion = new P((f, g) => {
          this._resolve = f, this._reject = g;
        }), this._completion.then(() => {
          this.active = !1, this.on.complete.fire();
        }, (f) => {
          var g = this.active;
          return this.active = !1, this.on.error.fire(f), this.parent ? this.parent._reject(f) : g && this.idbtrans && this.idbtrans.abort(), R(f);
        });
      });
    }(this), this.Version = function(a) {
      return Me(as.prototype, function(c) {
        this.db = a, this._cfg = { version: c, storesSource: null, dbschema: {}, tables: {}, contentUpgrade: null };
      });
    }(this), this.WhereClause = function(a) {
      return Me(ur.prototype, function(c, h, u) {
        this.db = a, this._ctx = { table: c, index: h === ":id" ? null : h, or: u };
        const d = a._deps.indexedDB;
        if (!d) throw new S.MissingAPI();
        this._cmp = this._ascending = d.cmp.bind(d), this._descending = (l, f) => d.cmp(f, l), this._max = (l, f) => d.cmp(l, f) > 0 ? l : f, this._min = (l, f) => d.cmp(l, f) < 0 ? l : f, this._IDBKeyRange = a._deps.IDBKeyRange;
      });
    }(this), this.on("versionchange", (a) => {
      a.newVersion > 0 ? console.warn(`Another connection wants to upgrade database '${this.name}'. Closing db now to resume the upgrade.`) : console.warn(`Another connection wants to delete database '${this.name}'. Closing db now to resume the delete request.`), this.close();
    }), this.on("blocked", (a) => {
      !a.newVersion || a.newVersion < a.oldVersion ? console.warn(`Dexie.delete('${this.name}') was blocked`) : console.warn(`Upgrade '${this.name}' blocked by other connection holding version ${a.oldVersion / 10}`);
    }), this._maxKey = He(n.IDBKeyRange), this._createTransaction = (a, c, h, u) => new this.Transaction(a, c, h, this._options.chromeTransactionDurability, u), this._fireOnBlocked = (a) => {
      this.on("blocked").fire(a), je.filter((c) => c.name === this.name && c !== this && !c._state.vcFired).map((c) => c.on("versionchange").fire(a));
    }, this.use(hs), this.use(ds), this.use(ys), this.use(fs), this.vip = Object.create(this, { _vip: { value: !0 } }), s.forEach((a) => a(this));
  }
  version(e) {
    if (isNaN(e) || e < 0.1) throw new S.Type("Given version is not a positive number");
    if (e = Math.round(10 * e) / 10, this.idbdb || this._state.isBeingOpened) throw new S.Schema("Cannot add version when database is open");
    this.verno = Math.max(this.verno, e);
    const n = this._versions;
    var r = n.filter((s) => s._cfg.version === e)[0];
    return r || (r = new this.Version(e), n.push(r), n.sort(is), r.stores({}), this._state.autoSchema = !1, r);
  }
  _whenReady(e) {
    return this.idbdb && (this._state.openComplete || E.letThrough || this._vip) ? e() : new P((n, r) => {
      if (this._state.openComplete) return r(new S.DatabaseClosed(this._state.dbOpenError));
      if (!this._state.isBeingOpened) {
        if (!this._options.autoOpen) return void r(new S.DatabaseClosed());
        this.open().catch(N);
      }
      this._state.dbReadyPromise.then(n, r);
    }).then(e);
  }
  use({ stack: e, create: n, level: r, name: s }) {
    s && this.unuse({ stack: e, name: s });
    const i = this._middlewares[e] || (this._middlewares[e] = []);
    return i.push({ stack: e, create: n, level: r ?? 10, name: s }), i.sort((o, a) => o.level - a.level), this;
  }
  unuse({ stack: e, name: n, create: r }) {
    return e && this._middlewares[e] && (this._middlewares[e] = this._middlewares[e].filter((s) => r ? s.create !== r : !!n && s.name !== n)), this;
  }
  open() {
    return us(this);
  }
  _close() {
    const e = this._state, n = je.indexOf(this);
    if (n >= 0 && je.splice(n, 1), this.idbdb) {
      try {
        this.idbdb.close();
      } catch {
      }
      this._novip.idbdb = null;
    }
    e.dbReadyPromise = new P((r) => {
      e.dbReadyResolve = r;
    }), e.openCanceller = new P((r, s) => {
      e.cancelOpen = s;
    });
  }
  close() {
    this._close();
    const e = this._state;
    this._options.autoOpen = !1, e.dbOpenError = new S.DatabaseClosed(), e.isBeingOpened && e.cancelOpen(e.dbOpenError);
  }
  delete() {
    const e = arguments.length > 0, n = this._state;
    return new P((r, s) => {
      const i = () => {
        this.close();
        var o = this._deps.indexedDB.deleteDatabase(this.name);
        o.onsuccess = O(() => {
          (function({ indexedDB: a, IDBKeyRange: c }, h) {
            !bn(a) && h !== xt && gn(a, c).delete(h).catch(N);
          })(this._deps, this.name), r();
        }), o.onerror = G(s), o.onblocked = this._fireOnBlocked;
      };
      if (e) throw new S.InvalidArgument("Arguments not allowed in db.delete()");
      n.isBeingOpened ? n.dbReadyPromise.then(i) : i();
    });
  }
  backendDB() {
    return this.idbdb;
  }
  isOpen() {
    return this.idbdb !== null;
  }
  hasBeenClosed() {
    const e = this._state.dbOpenError;
    return e && e.name === "DatabaseClosed";
  }
  hasFailed() {
    return this._state.dbOpenError !== null;
  }
  dynamicallyOpened() {
    return this._state.autoSchema;
  }
  get tables() {
    return j(this._allTables).map((e) => this._allTables[e]);
  }
  transaction() {
    const e = ls.apply(this, arguments);
    return this._transaction.apply(this, e);
  }
  _transaction(e, n, r) {
    let s = E.trans;
    s && s.db === this && e.indexOf("!") === -1 || (s = null);
    const i = e.indexOf("?") !== -1;
    let o, a;
    e = e.replace("!", "").replace("?", "");
    try {
      if (a = n.map((h) => {
        var u = h instanceof this.Table ? h.name : h;
        if (typeof u != "string") throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
        return u;
      }), e == "r" || e === Dt) o = Dt;
      else {
        if (e != "rw" && e != Mt) throw new S.InvalidArgument("Invalid transaction mode: " + e);
        o = Mt;
      }
      if (s) {
        if (s.mode === Dt && o === Mt) {
          if (!i) throw new S.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
          s = null;
        }
        s && a.forEach((h) => {
          if (s && s.storeNames.indexOf(h) === -1) {
            if (!i) throw new S.SubTransaction("Table " + h + " not included in parent transaction.");
            s = null;
          }
        }), i && s && !s.active && (s = null);
      }
    } catch (h) {
      return s ? s._promise(null, (u, d) => {
        d(h);
      }) : R(h);
    }
    const c = fr.bind(null, this, o, a, s, r);
    return s ? s._promise(o, c, "lock") : E.trans ? Ke(E.transless, () => this._whenReady(c)) : this._whenReady(c);
  }
  table(e) {
    if (!V(this._allTables, e)) throw new S.InvalidTable(`Table ${e} does not exist`);
    return this._allTables[e];
  }
}
const ms = typeof Symbol < "u" && "observable" in Symbol ? Symbol.observable : "@@observable";
class gs {
  constructor(e) {
    this._subscribe = e;
  }
  subscribe(e, n, r) {
    return this._subscribe(e && typeof e != "function" ? e : { next: e, error: n, complete: r });
  }
  [ms]() {
    return this;
  }
}
function yr(t, e) {
  return j(e).forEach((n) => {
    wt(t[n] || (t[n] = new Q()), e[n]);
  }), t;
}
function bs(t) {
  let e, n = !1;
  const r = new gs((s) => {
    const i = ln(t);
    let o = !1, a = {}, c = {};
    const h = { get closed() {
      return o;
    }, unsubscribe: () => {
      o = !0, ce.storagemutated.unsubscribe(f);
    } };
    s.start && s.start(h);
    let u = !1, d = !1;
    function l() {
      return j(c).some((p) => a[p] && ps(a[p], c[p]));
    }
    const f = (p) => {
      yr(a, p), l() && g();
    }, g = () => {
      if (u || o) return;
      a = {};
      const p = {}, b = function(y) {
        i && Se();
        const m = () => oe(t, { subscr: y, trans: null }), w = E.trans ? Ke(E.transless, m) : m();
        return i && w.then(ne, ne), w;
      }(p);
      d || (ce($e, f), d = !0), u = !0, Promise.resolve(b).then((y) => {
        n = !0, e = y, u = !1, o || (l() ? g() : (a = {}, c = p, s.next && s.next(y)));
      }, (y) => {
        u = !1, n = !1, s.error && s.error(y), h.unsubscribe();
      });
    };
    return g(), h;
  });
  return r.hasValue = () => n, r.getValue = () => e, r;
}
let an;
try {
  an = { indexedDB: A.indexedDB || A.mozIndexedDB || A.webkitIndexedDB || A.msIndexedDB, IDBKeyRange: A.IDBKeyRange || A.webkitIDBKeyRange };
} catch {
  an = { indexedDB: null, IDBKeyRange: null };
}
const le = pe;
function dt(t) {
  let e = Z;
  try {
    Z = !0, ce.storagemutated.fire(t);
  } finally {
    Z = e;
  }
}
Ee(le, { ...ot, delete: (t) => new le(t, { addons: [] }).delete(), exists: (t) => new le(t, { addons: [] }).open().then((e) => (e.close(), !0)).catch("NoSuchDatabaseError", () => !1), getDatabaseNames(t) {
  try {
    return function({ indexedDB: e, IDBKeyRange: n }) {
      return bn(e) ? Promise.resolve(e.databases()).then((r) => r.map((s) => s.name).filter((s) => s !== xt)) : gn(e, n).toCollection().primaryKeys();
    }(le.dependencies).then(t);
  } catch {
    return R(new S.MissingAPI());
  }
}, defineClass: () => function(t) {
  $(this, t);
}, ignoreTransaction: (t) => E.trans ? Ke(E.transless, t) : t(), vip: rn, async: function(t) {
  return function() {
    try {
      var e = sn(t.apply(this, arguments));
      return e && typeof e.then == "function" ? e : P.resolve(e);
    } catch (n) {
      return R(n);
    }
  };
}, spawn: function(t, e, n) {
  try {
    var r = sn(t.apply(n, e || []));
    return r && typeof r.then == "function" ? r : P.resolve(r);
  } catch (s) {
    return R(s);
  }
}, currentTransaction: { get: () => E.trans || null }, waitFor: function(t, e) {
  const n = P.resolve(typeof t == "function" ? le.ignoreTransaction(t) : t).timeout(e || 6e4);
  return E.trans ? E.trans.waitFor(n) : n;
}, Promise: P, debug: { get: () => Y, set: (t) => {
  Vn(t, t === "dexie" ? () => !0 : or);
} }, derive: ke, extend: $, props: Ee, override: Ln, Events: Re, on: ce, liveQuery: bs, extendObservabilitySet: yr, getByKeyPath: te, setByKeyPath: W, delByKeyPath: function(t, e) {
  typeof e == "string" ? W(t, e, void 0) : "length" in e && [].map.call(e, function(n) {
    W(t, n, void 0);
  });
}, shallowClone: $n, deepClone: Ve, getObjectDiff: vn, cmp: q, asap: zn, minKey: Yt, addons: [], connections: je, errnames: dn, dependencies: an, semVer: Sn, version: Sn.split(".").map((t) => parseInt(t)).reduce((t, e, n) => t + e / Math.pow(10, 2 * n)) }), le.maxKey = He(le.dependencies.IDBKeyRange), typeof dispatchEvent < "u" && typeof addEventListener < "u" && (ce($e, (t) => {
  if (!Z) {
    let e;
    _t ? (e = document.createEvent("CustomEvent"), e.initCustomEvent(ie, !0, !0, t)) : e = new CustomEvent(ie, { detail: t }), Z = !0, dispatchEvent(e), Z = !1;
  }
}), addEventListener(ie, ({ detail: t }) => {
  Z || dt(t);
}));
let Z = !1;
if (typeof BroadcastChannel < "u") {
  const t = new BroadcastChannel(ie);
  typeof t.unref == "function" && t.unref(), ce($e, (e) => {
    Z || t.postMessage(e);
  }), t.onmessage = (e) => {
    e.data && dt(e.data);
  };
} else if (typeof self < "u" && typeof navigator < "u") {
  ce($e, (e) => {
    try {
      Z || (typeof localStorage < "u" && localStorage.setItem(ie, JSON.stringify({ trig: Math.random(), changedParts: e })), typeof self.clients == "object" && [...self.clients.matchAll({ includeUncontrolled: !0 })].forEach((n) => n.postMessage({ type: ie, changedParts: e })));
    } catch {
    }
  }), typeof addEventListener < "u" && addEventListener("storage", (e) => {
    if (e.key === ie) {
      const n = JSON.parse(e.newValue);
      n && dt(n.changedParts);
    }
  });
  const t = self.document && navigator.serviceWorker;
  t && t.addEventListener("message", function({ data: e }) {
    e && e.type === ie && dt(e.changedParts);
  });
}
P.rejectionMapper = function(t, e) {
  if (!t || t instanceof Pe || t instanceof TypeError || t instanceof SyntaxError || !t.name || !kn[t.name]) return t;
  var n = new kn[t.name](e || t.message, t);
  return "stack" in t && ee(n, "stack", { get: function() {
    return this.inner.stack;
  } }), n;
}, Vn(Y, or);
const Tt = {
  cosine: (t, e) => {
    const n = t.reduce((i, o, a) => i + o * e[a], 0), r = Math.sqrt(t.reduce((i, o) => i + o ** 2, 0)), s = Math.sqrt(e.reduce((i, o) => i + o ** 2, 0));
    return 1 - n / (r * s);
  },
  "cosine-normalized": (t, e) => 1 - t.reduce((r, s, i) => r + s * e[i], 0)
};
class Ne {
  constructor(e, n) {
    /** The unique key of an element. */
    D(this, "key");
    /** The embedding value of the element. */
    D(this, "value");
    /** Whether the node is marked as deleted. */
    D(this, "isDeleted");
    this.key = e, this.value = n, this.isDeleted = !1;
  }
}
class vs {
  constructor() {
    D(this, "nodesMap");
    D(this, "shouldPreComputeDistance", !1);
    D(this, "distanceCache", /* @__PURE__ */ new Map());
    this.nodesMap = /* @__PURE__ */ new Map();
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async size() {
    return this.nodesMap.size;
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async has(e) {
    return this.nodesMap.has(e);
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async get(e, n) {
    return this.nodesMap.get(e);
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async set(e, n) {
    this.nodesMap.set(e, n);
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async keys() {
    return [...this.nodesMap.keys()];
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async bulkSet(e, n) {
    for (const [r, s] of e.entries())
      this.nodesMap.set(s, n[r]);
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async clear() {
    this.nodesMap = /* @__PURE__ */ new Map();
  }
  preComputeDistance(e) {
  }
}
class ws {
  /**
   *
   * @param graphLayers Graph layers used to pre-fetch embeddings form indexedDB
   * @param prefetchSize Number of items to prefetch.
   */
  constructor(e, n, r, s = 4096) {
    D(this, "nodesMap");
    D(this, "dbPromise");
    /**
     * Graph layers from the index. We need it to pre-fetch data from indexedDB
     */
    D(this, "graphLayers");
    D(this, "prefetchSize");
    D(this, "hasSetPrefetchSize");
    D(this, "_prefetchTimes", 0);
    D(this, "shouldPreComputeDistance", !1);
    D(this, "distanceCache", /* @__PURE__ */ new Map());
    D(this, "distanceCacheMaxSize");
    this.nodesMap = /* @__PURE__ */ new Map(), this.graphLayers = e, r !== void 0 ? (this.prefetchSize = r, this.hasSetPrefetchSize = !0) : (this.prefetchSize = 8e3, this.hasSetPrefetchSize = !1), n === !0 && (this.shouldPreComputeDistance = !0), this.distanceCacheMaxSize = s;
    const i = new pe("mememo-index-store");
    i.version(1).stores({
      mememo: "key"
    });
    const o = i.table("mememo");
    this.dbPromise = o.clear().then(() => o);
  }
  async size() {
    return await (await this.dbPromise).count();
  }
  async has(e) {
    return await (await this.dbPromise).get(e) !== void 0;
  }
  async get(e, n) {
    if (this.nodesMap.has(e) || await this._prefetch(e, n), !this.nodesMap.has(e))
      throw Error(`The node ${e} is not in memory after pre-fetching.`);
    return this.nodesMap.get(e);
  }
  async set(e, n) {
    this.hasSetPrefetchSize || this._updateAutoPrefetchSize(n.value.length), await (await this.dbPromise).put(n, e), this.nodesMap.has(e) && this.nodesMap.set(e, n);
  }
  async keys() {
    return await (await this.dbPromise).toCollection().primaryKeys();
  }
  async bulkSet(e, n) {
    !this.hasSetPrefetchSize && n.length > 0 && this._updateAutoPrefetchSize(n[0].value.length), await (await this.dbPromise).bulkPut(n);
    for (let s = 0; s < Math.min(this.prefetchSize, e.length); s++)
      this.nodesMap.set(e[s], n[s]);
  }
  async clear() {
    await (await this.dbPromise).clear();
  }
  /**q
   * Automatically update the prefetch size based on the size of embeddings.
   * The goal is to control the memory usage under 50MB.
   * 50MB ~= 6.25M numbers (8 bytes) ~= 16k 384-dim arrays
   */
  _updateAutoPrefetchSize(e) {
    if (!this.hasSetPrefetchSize) {
      const r = Math.floor(625e4);
      this.prefetchSize = Math.floor(r / e), this.hasSetPrefetchSize = !0;
    }
  }
  /**
   * Prefetch the embeddings of the current nodes and its neighbors from the
   * indexedDB. We use BFS prioritizing closest neighbors until hitting the
   * `this.prefetchSize` limit
   * @param key Current node key
   */
  async _prefetch(e, n) {
    this.nodesMap.clear();
    const r = this.graphLayers[n], s = (u) => u.distance, i = new it(s), o = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set();
    for (i.push({ key: e, distance: 0 }), o.add(e); i.size() > 0 && a.size < this.prefetchSize; ) {
      const u = i.pop();
      if (u === null)
        break;
      a.add(u.key);
      const d = r.graph.get(u.key);
      if (d === void 0)
        throw Error(`Cannot find node with key ${u.key}`);
      for (const l of d.keys()) {
        const f = d.get(l);
        o.has(l) || (o.add(l), i.push({
          key: l,
          distance: u.distance + f
        }));
      }
    }
    const h = await (await this.dbPromise).bulkGet([...a]);
    for (; h.length > 0; ) {
      const u = h.pop();
      u !== void 0 && this.nodesMap.set(u.key, u);
    }
    this._prefetchTimes += 1;
  }
  preComputeDistance(e) {
    !this.nodesMap.has(e) || this.shouldPreComputeDistance;
  }
}
class Tn {
  /**
   * Initialize a new graph layer.
   * @param key The first key to insert into the graph layer.
   */
  constructor(e) {
    /** The graph maps a key to its neighbor and distances */
    D(this, "graph");
    this.graph = /* @__PURE__ */ new Map(), this.graph.set(e, /* @__PURE__ */ new Map());
  }
  toJSON() {
    const e = {};
    for (const [n, r] of this.graph.entries()) {
      const s = {};
      for (const [i, o] of r.entries())
        s[i] = o;
      e[n] = s;
    }
    return e;
  }
  loadJSON(e) {
    this.graph = /* @__PURE__ */ new Map();
    for (const n of Object.keys(e)) {
      const r = e[n], s = /* @__PURE__ */ new Map();
      for (const i of Object.keys(r)) {
        const o = r[i];
        s.set(i, o);
      }
      this.graph.set(n, s);
    }
  }
}
class xs {
  /**
   * Constructs a new instance of the class.
   * @param config - The configuration object.
   * @param config.distanceFunction - Distance function. Default: 'cosine'
   * @param config.m -  The max number of neighbors for each node. A reasonable
   * range of m is from 5 to 48. Smaller m generally produces better results for
   * lower recalls and/or lower dimensional data, while bigger m is better for
   * high recall and/or high dimensional data. Default: 16
   * @param config.efConstruction - The number of neighbors to consider in
   * construction's greedy search. Default: 100
   * @param config.mMax0 - The maximum number of connections that a node can
   * have in the zero layer. Default 2 * m.
   * @param config.ml - Normalizer parameter. Default 1 / ln(m)
   * @param config.seed - Optional random seed.
   * @param config.useIndexedDB - Whether to use indexedDB
   * @param config.distancePrecision - How many decimals to store for distances
   */
  constructor({ distanceFunction: e, m: n, efConstruction: r, mMax0: s, ml: i, seed: o, useIndexedDB: a, distancePrecision: c }) {
    D(this, "distanceFunction");
    D(this, "distanceFunctionType");
    D(this, "_distanceFunctionCallTimes", 0);
    D(this, "_distanceFunctionSkipTimes", 0);
    D(this, "useDistanceCache", !1);
    D(this, "distancePrecision", 6);
    /** The max number of neighbors for each node. */
    D(this, "m");
    /** The number of neighbors to consider in construction's greedy search. */
    D(this, "efConstruction");
    /** The number of neighbors to keep for each node at the first level. */
    D(this, "mMax0");
    /** Normalizer parameter controlling number of overlaps across layers. */
    D(this, "ml");
    /** Seeded random number generator */
    D(this, "seed");
    D(this, "rng");
    /** A collection all the nodes */
    D(this, "nodes");
    /** A list of all layers */
    D(this, "graphLayers");
    /** Current entry point of the graph */
    D(this, "entryPointKey", null);
    D(this, "useIndexedDB", !0);
    this.m = n || 16, this.efConstruction = r || 100, this.mMax0 = s || this.m * 2, this.ml = i || 1 / Math.log(this.m), this.seed = o || vr()(), this.distancePrecision = c || 6, this.rng = xr(this.seed);
    let h = Tt["cosine-normalized"];
    this.distanceFunctionType = "cosine-normalized", e === void 0 ? (h = Tt["cosine-normalized"], this.distanceFunctionType = "cosine-normalized") : typeof e == "string" ? (h = Tt[e], e === "cosine-normalized" ? this.distanceFunctionType = "cosine-normalized" : e === "cosine" && (this.distanceFunctionType = "cosine")) : (h = e, this.distanceFunctionType = "custom"), this.useDistanceCache = !1, this.graphLayers = [], a === void 0 || a === !1 ? (this.useIndexedDB = !1, this.nodes = new vs()) : (this.useIndexedDB = !0, this.nodes = new ws(this.graphLayers, this.useDistanceCache)), this.distanceFunction = (u, d, l, f) => {
      if (!this.useDistanceCache || l === null || f === null)
        return this._distanceFunctionCallTimes += 1, jn(h(u, d), this.distancePrecision);
      const g = `${l}-${f}`, p = `${f}-${l}`;
      if (this.nodes.distanceCache.has(g))
        return this._distanceFunctionSkipTimes += 1, this.nodes.distanceCache.get(g);
      if (this.nodes.distanceCache.has(p))
        return this._distanceFunctionSkipTimes += 1, this.nodes.distanceCache.get(p);
      const b = jn(h(u, d), this.distancePrecision);
      return this._distanceFunctionCallTimes += 1, b;
    };
  }
  /**
   * Serialize the index into a JSON string
   */
  exportIndex() {
    const e = this.graphLayers.map((r) => r.toJSON());
    return {
      distanceFunctionType: this.distanceFunctionType,
      m: this.m,
      efConstruction: this.efConstruction,
      mMax0: this.mMax0,
      ml: this.ml,
      seed: this.seed,
      useIndexedDB: this.useIndexedDB,
      useDistanceCache: this.useDistanceCache,
      entryPointKey: this.entryPointKey,
      graphLayers: e
    };
  }
  /**
   * Load HNSW index from a JSON object. Note that the nodes' embeddings ARE NOT
   * loaded. You need to call insertSkipIndexing() to insert node embeddings
   * AFTER this call.
   * @param mememoIndex JSON format of the created index
   */
  loadIndex(e) {
    this.distanceFunctionType = e.distanceFunctionType, this.m = e.m, this.efConstruction = e.efConstruction, this.mMax0 = e.mMax0, this.ml = e.ml, this.seed = e.seed, this.useIndexedDB = e.useIndexedDB, this.useDistanceCache = e.useDistanceCache, this.entryPointKey = e.entryPointKey, this.graphLayers = [];
    for (const n of e.graphLayers) {
      const r = new Tn("");
      r.loadJSON(n), this.graphLayers.push(r);
    }
  }
  /**
   * Insert a new element to the index.
   * @param key Key of the new element.
   * @param value The embedding of the new element to insert.
   * @param maxLevel The max layer to insert this element. You don't need to set
   * this value in most cases. We add this parameter for testing purpose.
   */
  async insert(e, n, r) {
    const s = r === void 0 ? this._getRandomLevel() : r;
    if (await this.nodes.has(e)) {
      const i = await this._getNodeInfo(e, s);
      if (i.isDeleted) {
        i.isDeleted = !1, await this.nodes.set(e, i), await this.update(e, n);
        return;
      }
      throw Error(`There is already a node with key ${e} in theindex. Use update() to update this node.`);
    }
    await this.nodes.set(e, new Ne(e, n)), await this._insertToGraph(e, n, s);
  }
  /**
   * Insert new elements to the index.
   * @param keys Key of the new elements.
   * @param values The embeddings of the new elements to insert.
   * @param maxLevel The max layer to insert this element. You don't need to set
   * this value in most cases. We add this parameter for testing purpose.
   */
  async bulkInsert(e, n, r) {
    const s = await this.nodes.keys();
    for (const o of e)
      if (s.includes(o))
        throw Error(`There is already a node with key ${o} in theindex. Use update() to update this node.`);
    const i = [];
    for (const [o, a] of e.entries())
      i.push(new Ne(a, n[o]));
    await this.nodes.bulkSet(e, i);
    for (const [o, a] of e.entries())
      if (r === void 0) {
        const c = this._getRandomLevel();
        await this._insertToGraph(a, n[o], c);
      } else
        await this._insertToGraph(a, n[o], r[o]);
  }
  /**
   * Insert a new element's embedding to the index. It assumes this element is
   * already in the index.
   * @param key Key of the new element.
   * @param value The embedding of the new element to insert.
   */
  async insertSkipIndex(e, n) {
    if (await this.nodes.has(e))
      throw Error(`There is already a node with key ${e} in the index.`);
    await this.nodes.set(e, new Ne(e, n));
  }
  /**
   * Insert new elements' embeddings to the index. It assumes elements are
   * already in the index.
   * @param keys Key of the new elements.
   * @param values The embeddings of the new elements to insert.
   */
  async bulkInsertSkipIndex(e, n) {
    const r = await this.nodes.keys();
    for (const i of e)
      if (r.includes(i))
        throw Error(`There is already a node with key ${i} in the index.`);
    const s = [];
    for (const [i, o] of e.entries())
      s.push(new Ne(o, n[i]));
    await this.nodes.bulkSet(e, s);
  }
  /**
   * Helper function to insert the new element to the graphs
   * @param key Key of the new element
   * @param value Embeddings of the new element
   * @param level Max level for this insert
   */
  async _insertToGraph(e, n, r) {
    if (this.entryPointKey !== null) {
      this.nodes.shouldPreComputeDistance && this.nodes.preComputeDistance(e);
      const s = await this._getNodeInfo(this.entryPointKey, this.graphLayers.length - 1);
      let i = this.distanceFunction(n, s.value, e, s.key), o = this.entryPointKey;
      for (let h = this.graphLayers.length - 1; h >= r + 1; h--) {
        const u = await this._searchLayerEF1(e, n, o, i, h);
        i = u.minDistance, o = u.minNodeKey;
      }
      let a = [
        { key: o, distance: i }
      ];
      const c = Math.min(this.graphLayers.length - 1, r);
      for (let h = c; h >= 0; h--) {
        const u = h === 0 ? this.mMax0 : this.m;
        a = await this._searchLayer(e, n, a, h, this.efConstruction);
        const d = await this._selectNeighborsHeuristic(a, u, h), l = /* @__PURE__ */ new Map();
        for (const f of d)
          l.set(f.key, f.distance);
        this.graphLayers[h].graph.set(e, l);
        for (const f of d) {
          const g = this.graphLayers[h].graph.get(f.key);
          if (g === void 0)
            throw Error(`Can't find neighbor node ${f.key}`);
          const p = [];
          for (const [m, w] of g.entries()) {
            const x = { key: m, distance: w };
            p.push(x);
          }
          p.push({ key: e, distance: f.distance });
          const b = await this._selectNeighborsHeuristic(p, u, h), y = /* @__PURE__ */ new Map();
          for (const m of b)
            y.set(m.key, m.distance);
          this.graphLayers[h].graph.set(f.key, y);
        }
      }
    }
    for (let s = this.graphLayers.length; s < r + 1; s++)
      this.graphLayers.push(new Tn(e)), this.entryPointKey = e;
  }
  /**
   * Update an element in the index
   * @param key Key of the element.
   * @param value The new embedding of the element
   */
  async update(e, n) {
    if (!await this.nodes.has(e))
      throw Error(`The node with key ${e} does not exist. Use insert() to add new node.`);
    if (await this.nodes.set(e, new Ne(e, n)), !(this.entryPointKey === e && await this.nodes.size() === 1)) {
      for (let r = 0; r < this.graphLayers.length; r++) {
        const s = this.graphLayers[r], i = r === 0 ? this.mMax0 : this.m;
        if (!s.graph.has(e))
          break;
        const o = s.graph.get(e), a = /* @__PURE__ */ new Set([e]);
        for (const h of o.keys()) {
          a.add(h);
          const u = s.graph.get(h);
          if (u === void 0)
            throw Error(`Can't find node with key ${h}`);
          for (const d of u.keys())
            a.add(d);
        }
        const c = (h) => h.distance;
        for (const h of o.keys()) {
          const u = new xn(c), d = await this._getNodeInfo(h, r);
          for (const p of a) {
            if (p === h)
              continue;
            const b = await this._getNodeInfo(p, r), y = this.distanceFunction(d.value, b.value, d.key, b.key);
            u.size() < this.efConstruction ? u.push({ key: p, distance: y }) : y < u.top().distance && (u.pop(), u.push({ key: p, distance: y }));
          }
          const l = u.toArray(), f = await this._selectNeighborsHeuristic(l, i, r), g = /* @__PURE__ */ new Map();
          for (const p of f)
            g.set(p.key, p.distance);
          s.graph.set(h, g);
        }
      }
      await this._reIndexNode(e, n);
    }
  }
  /**
   * Mark an element in the index as deleted.
   * This function does not delete the node from memory, but just remove it from
   * query result in the future. Future queries can still use this node to reach
   * other nodes. Future insertions will not add new edge to this node.
   *
   * See https://github.com/nmslib/hnswlib/issues/4 for discussion on the
   * challenges of deleting items in HNSW
   *
   * @param key Key of the node to delete
   */
  async markDeleted(e) {
    if (!await this.nodes.has(e))
      throw Error(`Node with key ${e} does not exist.`);
    if (this.entryPointKey === e) {
      let r = null;
      for (let s = this.graphLayers.length - 1; s >= 0; s--) {
        for (const i of this.graphLayers[s].graph.keys()) {
          const o = await this._getNodeInfo(i, s);
          if (i !== e && !o.isDeleted) {
            r = i;
            break;
          }
        }
        if (r !== null)
          break;
        this.graphLayers.splice(s, 1);
      }
      if (r === null) {
        await this.clear();
        return;
      }
      this.entryPointKey = r;
    }
    const n = await this._getNodeInfo(e, 0);
    n.isDeleted = !0, await this.nodes.set(e, n);
  }
  /**
   * UnMark a deleted element in the index.
   *
   * See https://github.com/nmslib/hnswlib/issues/4 for discussion on the
   * challenges of deleting items in HNSW
   *
   * @param key Key of the node to recover
   */
  async unMarkDeleted(e) {
    const n = await this._getNodeInfo(e, 0);
    n.isDeleted = !1, await this.nodes.set(e, n);
  }
  /**
   * Reset the index.
   */
  async clear() {
    this.graphLayers = [], await this.nodes.clear();
  }
  /**
   * Find k nearest neighbors of the query point
   * @param value Embedding value
   * @param k k nearest neighbors of the query value
   * @param ef Number of neighbors to search at each step
   */
  async query(e, n = void 0, r = this.efConstruction) {
    if (this.entryPointKey === null)
      throw Error("Index is not initialized yet");
    let s = this.entryPointKey;
    const i = await this._getNodeInfo(s, this.graphLayers.length - 1);
    let o = this.distanceFunction(i.value, e, null, null);
    for (let l = this.graphLayers.length - 1; l >= 1; l--) {
      const f = await this._searchLayerEF1(null, e, s, o, l, !1);
      s = f.minNodeKey, o = f.minDistance;
    }
    const a = [
      { key: s, distance: o }
    ], c = await this._searchLayer(null, e, a, 0, r, !1);
    c.sort((l, f) => l.distance - f.distance);
    const h = n === void 0 ? c : c.slice(0, n), u = [], d = [];
    for (const l of h)
      u.push(l.key), d.push(l.distance);
    return {
      keys: u,
      distances: d
    };
  }
  /**
   * Re-index an existing element's outgoing edges by repeating the insert()
   * algorithm (without updating its neighbor's edges)
   * @param key Key of an existing element
   * @param value Embedding value of an existing element
   */
  async _reIndexNode(e, n) {
    if (this.entryPointKey === null)
      throw Error("entryPointKey is null");
    let r = this.entryPointKey;
    const s = await this._getNodeInfo(r, this.graphLayers.length - 1);
    let i = this.distanceFunction(s.value, n, s.key, e), o = [
      { key: r, distance: i }
    ];
    for (let a = this.graphLayers.length - 1; a >= 0; a--) {
      const c = this.graphLayers[a];
      if (c.graph.has(e)) {
        const h = a === 0 ? this.mMax0 : this.m;
        o = await this._searchLayer(
          e,
          n,
          o,
          a,
          /** Here ef + 1 because this node is already in the index */
          this.efConstruction + 1
        ), o = o.filter((l) => l.key !== e);
        const u = await this._selectNeighborsHeuristic(o, h, a), d = /* @__PURE__ */ new Map();
        for (const l of u)
          d.set(l.key, l.distance);
        c.graph.set(e, d);
      } else {
        const h = await this._searchLayerEF1(e, n, r, i, a);
        r = h.minNodeKey, i = h.minDistance;
      }
    }
  }
  /**
   * Greedy search the closest neighbor in a layer.
   * @param queryKey The key of the query
   * @param queryValue The embedding value of the query
   * @param entryPointKey Current entry point of this layer
   * @param entryPointDistance Distance between query and entry point
   * @param level Current graph layer level
   * @param canReturnDeletedNodes Whether to return deleted nodes
   */
  async _searchLayerEF1(e, n, r, s, i, o = !0) {
    const a = this.graphLayers[i], c = (f) => f.distance, h = new it(c);
    h.push({ key: r, distance: s });
    let u = r, d = s;
    const l = /* @__PURE__ */ new Set();
    for (; h.size() > 0; ) {
      const f = h.pop();
      if (f.distance > d)
        break;
      const g = a.graph.get(f.key);
      if (g === void 0)
        throw Error(`Cannot find node with key ${f.key})}`);
      for (const p of g.keys())
        if (!l.has(p)) {
          l.add(p);
          const b = await this._getNodeInfo(p, i), y = this.distanceFunction(b.value, n, b.key, e);
          y < d && ((!b.isDeleted || o) && (d = y, u = p), h.push({ key: p, distance: y }));
        }
    }
    return {
      minNodeKey: u,
      minDistance: d
    };
  }
  /**
   * Greedy search `ef` closest points in a given layer
   * @param queryKey The key of the query
   * @param queryValue Embedding value of the query point
   * @param entryPoints Entry points of this layer
   * @param level Current layer level to search
   * @param ef Number of neighbors to consider during search
   * @param canReturnDeletedNodes Whether to return deleted nodes
   */
  async _searchLayer(e, n, r, s, i, o = !0) {
    const a = this.graphLayers[s], c = (l) => l.distance, h = new it(c), u = new xn(c), d = /* @__PURE__ */ new Set();
    for (const l of r)
      h.push(l), u.push(l), d.add(l.key);
    for (; h.size() > 0; ) {
      const l = h.pop(), f = u.root();
      if (l.distance > f.distance)
        break;
      const g = a.graph.get(l.key);
      if (g === void 0)
        throw Error(`Cannot find node with key ${l.key}`);
      for (const p of g.keys())
        if (!d.has(p)) {
          d.add(p);
          const b = await this._getNodeInfo(p, s), y = this.distanceFunction(n, b.value, e, b.key), m = u.root();
          (y < m.distance || u.size() < i) && ((!b.isDeleted || o) && u.push({ key: p, distance: y }), h.push({ key: p, distance: y }), u.size() > i && u.pop());
        }
    }
    return u.toArray();
  }
  /**
   * Simple heuristic to select neighbors. This function is different from
   * SELECT-NEIGHBORS-HEURISTIC in the HNSW paper. This function is based on
   * hnswlib and datasketch's implementations.
   * When selecting a neighbor, we compare the distance between selected
   * neighbors and the potential neighbor to the distance between the inserted
   * point and the potential neighbor. We favor neighbors that are further
   * away from selected neighbors to improve diversity.
   *
   * https://github.com/nmslib/hnswlib/blob/978f7137bc9555a1b61920f05d9d0d8252ca9169/hnswlib/hnswalg.h#L382
   * https://github.com/ekzhu/datasketch/blob/9973b09852a5018f23d831b1868da3a5d2ce6a3b/datasketch/hnsw.py#L832
   *
   * @param candidates Potential neighbors to select from
   * @param maxSize Max neighbors to connect to
   * @param level Current graph layer level
   */
  async _selectNeighborsHeuristic(e, n, r) {
    if (e.length < n)
      return e;
    const s = (a) => a.distance, i = new it(s);
    for (const a of e)
      i.insert(a);
    const o = [];
    for (; i.size() > 0; ) {
      if (o.length >= n)
        return o;
      const a = i.pop();
      let c = !0;
      for (const h of o) {
        const u = await this._getNodeInfo(a.key, r), d = await this._getNodeInfo(h.key, r);
        if (this.distanceFunction(u.value, d.value, a.key, d.key) < a.distance) {
          c = !1;
          break;
        }
      }
      c && o.push(a);
    }
    return o;
  }
  /**
   * Generate a random level for a node using a exponentially decaying
   * probability distribution
   */
  _getRandomLevel() {
    return Math.floor(-Math.log(this.rng()) * this.ml);
  }
  /**
   * Helper function to get the node in the global index
   * @param key Node key
   * @param level The current graph level. Note the node's embedding is the same
   * across levels, but we need the level number to pre-fetch node / neighbor
   * embeddings from indexedDB
   */
  async _getNodeInfo(e, n) {
    const r = await this.nodes.get(e, n);
    if (r === void 0)
      throw Error(`Can't find node with key ${e}`);
    return r;
  }
}
const jn = (t, e) => Math.round((t + Number.EPSILON) * 10 ** e) / 10 ** e;
export {
  xs as HNSW,
  jn as round
};
//# sourceMappingURL=index.es.js.map
