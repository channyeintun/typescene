import {
  ComponentEvent,
  ComponentEventHandler,
  managed,
  ManagedEvent,
  ManagedObject,
  shadowObservable,
  observe,
} from "../../core";
import { UICell } from "../containers/UICell";
import { UIRenderableConstructor } from "../UIComponent";
import { UIRenderableController } from "../UIRenderableController";

/** Event that is emitted on a particular `UIListCellAdapter`. */
export class UIListCellAdapterEvent<
  TObject extends ManagedObject = ManagedObject
> extends ComponentEvent {
  constructor(name: string, source: UIListCellAdapter<TObject>, inner?: ManagedEvent) {
    super(name, source, inner);
    if (!source.content) throw TypeError();
    this.object = source.object;
    this.cell = source.content;
    this.value = source.value;
  }

  /** The cell that contains the component that originally emitted this event */
  readonly cell: UICell;

  /** The object encapsulated by the `UIListCellAdapter`, if any */
  readonly object?: TObject;

  /** The value encapsulated by the `UIListCellAdapter`, if any */
  readonly value?: any;
}

/** Component that can be used as an adapter to render items in a `UIListController`. Instances are constructed using a single argument (a managed object from `UIListController.items`), and encapsulate a `UICell` component. The static `with` method takes the same arguments as `UICell` itself along with additional properties to manage display of selected and focused cells. Encapsulated content can include bindings to the `object`, `value`, `selected`, and `hovered` properties. */
export class UIListCellAdapter<
  TObject extends ManagedObject = ManagedObject
> extends UIRenderableController<UICell> {
  static preset(
    presets: UIListCellAdapter.Presets,
    ...rest: Array<UIRenderableConstructor>
  ): Function {
    // separate event handlers from other presets
    let cellPresets: any = {};
    let handlers: any = {};
    for (let k in presets) {
      (k[0] === "o" && k[1] === "n" && (k.charCodeAt(2) < 97 || k.charCodeAt(2) > 122)
        ? handlers
        : cellPresets)[k] = (presets as any)[k];
    }
    if (!cellPresets.accessibleRole) cellPresets.accessibleRole = "listitem";
    let PresetCell = UICell.with(cellPresets, ...rest);
    let p = this.presetBoundComponent("content", PresetCell);
    p.limitBindings("object", "value", "selected", "hovered");
    return super.preset(handlers, PresetCell);
  }

  /**
   * Create a new component for given object.
   * @param object
   *  The encapsulated object */
  constructor(object: TObject) {
    super();
    this.object = object;
    this.value = object.valueOf();

    // propagate events as `UIListCellAdapterEvent`
    this.propagateChildEvents(e => {
      if (e instanceof ComponentEvent) {
        return new UIListCellAdapterEvent(e.name, this, e);
      }
    });
  }

  /** The encapsulated object */
  @managed
  readonly object: TObject;

  /** The intrinsic value of the encapsulated object (result of `valueOf()` called on the original object) */
  readonly value: any;

  /** Create and emit a `UIListCellAdapterEvent` with given name and a reference to this component and its cell and object; see `Component.propagateComponentEvent` */
  propagateComponentEvent(name: string, inner?: ManagedEvent) {
    if (!this.managedState) return;
    this.emit(UIListCellAdapterEvent, name, this, inner);
  }

  /** True if the cell is currently selected (based on `Select` and `Deselect` events) */
  @shadowObservable("_selected")
  get selected() {
    return this._selected;
  }

  /** True if the cell is currently hovered over using the mouse cursor (based on `MouseEnter` and `MouseLeave` events) */
  @shadowObservable("_hovered")
  get hovered() {
    return this._hovered;
  }

  /** Request input focus on the current cell */
  requestFocus() {
    this.content && this.content.requestFocus();
  }

  /** Request input focus for the next sibling cell */
  requestFocusNext() {
    this.content && this.content.requestFocusNext();
  }

  /** Request input focus for the previous sibling cell */
  requestFocusPrevious() {
    this.content && this.content.requestFocusPrevious();
  }

  /** @internal */
  @observe
  protected static UIListCellAdapterObserver = class {
    constructor(public readonly adapter: UIListCellAdapter) {}
    onSelect(e: ComponentEvent) {
      if (e.source === this.adapter || e.source === this.adapter.content) {
        this.adapter._selected = true;
      }
    }
    onDeselect(e: ComponentEvent) {
      if (e.source === this.adapter || e.source === this.adapter.content) {
        this.adapter._selected = false;
      }
    }
    onMouseEnter(e: ComponentEvent) {
      if (e.source === this.adapter || e.source === this.adapter.content) {
        this.adapter._hovered = true;
      }
    }
    onMouseLeave(e: ComponentEvent) {
      if (e.source === this.adapter || e.source === this.adapter.content) {
        this.adapter._hovered = false;
      }
    }
  };

  private _selected = false;
  private _hovered = false;
}

export namespace UIListCellAdapter {
  /** UICell presets type, for use with `Component.with` */
  export type Presets = Omit<UICell.Presets, keyof EventPresets> & EventPresets;
  export interface EventPresets {
    onMouseEnter?: ComponentEventHandler<UIListCellAdapter>;
    onMouseLeave?: ComponentEventHandler<UIListCellAdapter>;
    onSelect?: ComponentEventHandler<UIListCellAdapter>;
    onDeselect?: ComponentEventHandler<UIListCellAdapter>;
  }
}
