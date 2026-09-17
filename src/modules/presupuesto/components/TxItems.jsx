import { useState } from "react";
import { CategoryGlyph } from "../../categories/categories.constants";
import { formatCurrency, monthKeyLabel } from "../presupuesto.utils";

export function ExpenseItem({
  tx,
  category,
  source,
  dateLabel,
  bolsilloTag,
  onToggle,
  onEdit,
  dragMode,
  dragProps,
  hideIcon,
  showOwnerAvatar,
}) {
  const repeatsUntil = tx.fixed && tx.endMonth;
  return (
    <div
      className={`tx-item tx-item--gasto${tx.isPaid ? " tx-item--paid" : ""}${dragMode ? " tx-item--drag" : ""}`}
      data-drag-id={dragProps ? dragProps["data-drag-id"] : undefined}
    >
      <div className="tx-item__row">
        {dragMode && dragProps && (
          <span
            className="tx-item__drag"
            {...dragProps.handleProps}
            aria-label="Arrastrar para reordenar"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <circle cx="9" cy="6" r="1.6" />
              <circle cx="15" cy="6" r="1.6" />
              <circle cx="9" cy="12" r="1.6" />
              <circle cx="15" cy="12" r="1.6" />
              <circle cx="9" cy="18" r="1.6" />
              <circle cx="15" cy="18" r="1.6" />
            </svg>
          </span>
        )}
        {showOwnerAvatar ? (
          source?.photo ? (
            <img
              className="tx-item__avatar"
              src={source.photo}
              alt={source.name}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span
              className="tx-item__avatar"
              style={{ background: source?.color || "var(--color-primary)" }}
            >
              {(source?.name || "?").charAt(0).toUpperCase()}
            </span>
          )
        ) : (
          !hideIcon && (
            <span
              className="tx-item__icon-cat tx-item__icon-cat--square"
              style={{ background: category?.backgroundColor || "#a8a8b3" }}
            >
              <CategoryGlyph
                name={category?.icon || "cat1"}
                color="#ffffff"
                size={20}
              />
            </span>
          )
        )}
        <div className="tx-item__body">
          <div className="tx-item__titlerow">
            <p className="tx-item__title">{tx.description}</p>
            {!showOwnerAvatar && source?.name && (
              <span
                className="tx-item__owner"
                style={{ background: source.color, color: "#ffffff" }}
              >
                {source.name}
              </span>
            )}
          </div>
          <div className="tx-item__subrow">
            {dateLabel && <span className="tx-item__date">{dateLabel}</span>}
            <button
              type="button"
              className={`tx-pill tx-pill--${tx.isPaid ? "paid" : "pending"} tx-pill--btn`}
              onClick={() => onToggle(tx)}
            >
              {tx.isPaid ? "Pagado" : "Pendiente"}
            </button>
          </div>
        </div>
        <div className="tx-item__right tx-item__right--actions">
          <div className="tx-item__amountcol">
            <span className="tx-item__amount tx-item__amount--gasto">
              {formatCurrency(tx.amount)}
            </span>
            {repeatsUntil && (
              <span className="tx-pill tx-pill--until">
                Hasta {monthKeyLabel(tx.endMonth)}
              </span>
            )}
            {bolsilloTag && (
              <span
                className="tx-pill"
                style={{ background: bolsilloTag.color, color: "#ffffff" }}
              >
                {bolsilloTag.name}
              </span>
            )}
          </div>
          <button
            type="button"
            className="tx-item__edit"
            onClick={() => onEdit(tx)}
            aria-label="Editar gasto"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Bolsillo como accordion: cabecera con progreso y, al abrir, sus gastos + editar.
export function BolsilloAccordion({
  tx,
  used,
  childExpenses,
  categoryOf,
  source,
  dateLabelOf,
  onToggle,
  onEdit,
  dragMode,
  dragProps,
}) {
  const [open, setOpen] = useState(false);
  const total = Number(tx.amount) || 0;
  const available = total - (used || 0);
  const pct =
    total > 0 ? Math.min(100, Math.round(((used || 0) / total) * 100)) : 0;
  return (
    <div
      className={`tx-item bolsillo${open ? " bolsillo--open" : ""}${dragMode ? " tx-item--drag" : ""}`}
      data-drag-id={dragProps ? dragProps["data-drag-id"] : undefined}
    >
      <div className="tx-item__row">
        {dragMode && dragProps && (
          <span
            className="tx-item__drag"
            {...dragProps.handleProps}
            aria-label="Arrastrar para reordenar"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <circle cx="9" cy="6" r="1.6" />
              <circle cx="15" cy="6" r="1.6" />
              <circle cx="9" cy="12" r="1.6" />
              <circle cx="15" cy="12" r="1.6" />
              <circle cx="9" cy="18" r="1.6" />
              <circle cx="15" cy="18" r="1.6" />
            </svg>
          </span>
        )}
        <span
          className="tx-item__icon-cat tx-item__icon-cat--square"
          style={{ background: tx.color || "var(--color-primary)" }}
        >
          {tx.icon ? (
            <CategoryGlyph name={tx.icon} color="#ffffff" size={20} />
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8h16a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1z" />
              <path d="M3 8l2.2-3.2A2 2 0 0 1 6.8 4h8.4a2 2 0 0 1 1.6.8L19 8" />
              <circle cx="16" cy="13.5" r="1.2" />
            </svg>
          )}
        </span>
        <div className="bolsillo__main">
          <div className="bolsillo__line">
            <div className="tx-item__body">
              <div className="tx-item__titlerow">
                <p className="tx-item__title">{tx.description}</p>
                {source?.name && (
                  <span
                    className="tx-item__owner"
                    style={{ background: source.color, color: "#fff" }}
                  >
                    {source.name}
                  </span>
                )}
              </div>
            </div>
            <div className="tx-item__right tx-item__right--actions">
              <span
                className={`tx-item__amount ${available >= 0 ? "tx-item__amount--income" : "tx-item__amount--gasto"}`}
              >
                {formatCurrency(available)}
              </span>
              <button
                type="button"
                className="tx-item__edit bolsillo__toggle"
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Ocultar detalle" : "Ver detalle"}
              >
                <svg
                  className={`bolsillo__chevron${open ? " bolsillo__chevron--open" : ""}`}
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="tx-item__bar">
            <div className="tx-item__bar-track">
              <div
                className="tx-item__bar-fill"
                style={{
                  width: `${pct}%`,
                  background: tx.color || "var(--color-primary)",
                }}
              />
            </div>
            <span className="tx-item__bar-label">
              {formatCurrency(used || 0)} de {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>
      {open && (
        <div className="bolsillo__body">
          {childExpenses.length === 0 ? (
            <p className="tx-empty">Aún no hay gastos de este bolsillo.</p>
          ) : (
            childExpenses.map((c) => (
              <ExpenseItem
                key={c.id}
                tx={c}
                category={categoryOf(c.categoryId)}
                source={null}
                dateLabel={dateLabelOf ? dateLabelOf(c) : null}
                onToggle={onToggle}
                onEdit={onEdit}
              />
            ))
          )}
          <button
            type="button"
            className="bolsillo__edit"
            onClick={() => onEdit(tx)}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 8L4 16v4h4l8-8" />
              <path d="M12 8l2.9-2.9a1.5 1.5 0 0 1 2.1 0l1.8 1.8a1.5 1.5 0 0 1 0 2.1L16 12" />
            </svg>
            Editar
          </button>
        </div>
      )}
    </div>
  );
}

// Categoría como accordion: cabecera con progreso (pagado vs total) y, al abrir, sus gastos.
export function CategoryAccordion({
  category,
  expenses,
  onToggle,
  onEdit,
  dateLabelOf,
  sourceOf,
  dragMode,
  dragProps,
  itemDragMode,
  itemDragPropsFor,
  ownerAvatar,
}) {
  const [open, setOpen] = useState(false);
  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const paid = expenses.reduce(
    (s, e) => s + (e.isPaid ? Number(e.amount) || 0 : 0),
    0,
  );
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const color = category?.backgroundColor || "#a8a8b3";
  const name = category?.name || "Sin categoría";
  return (
    <div
      className={`tx-item bolsillo${open ? " bolsillo--open" : ""}${dragMode ? " tx-item--drag" : ""}`}
      data-cat-id={dragProps ? dragProps["data-cat-id"] : undefined}
    >
      <div className="tx-item__row">
        {dragMode && dragProps && (
          <span
            className="tx-item__drag"
            {...dragProps.handleProps}
            aria-label="Arrastrar para reordenar"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <circle cx="9" cy="6" r="1.6" />
              <circle cx="15" cy="6" r="1.6" />
              <circle cx="9" cy="12" r="1.6" />
              <circle cx="15" cy="12" r="1.6" />
              <circle cx="9" cy="18" r="1.6" />
              <circle cx="15" cy="18" r="1.6" />
            </svg>
          </span>
        )}
        <span
          className="tx-item__icon-cat tx-item__icon-cat--square"
          style={{ background: color }}
        >
          <CategoryGlyph
            name={category?.icon || "cat1"}
            color="#ffffff"
            size={20}
          />
        </span>
        <div className="bolsillo__main">
          <div className="bolsillo__line">
            <div className="tx-item__body">
              <div className="tx-item__titlerow">
                <p className="tx-item__title">{name}</p>
                <span
                  className="tx-item__owner"
                  style={{ background: color, color: "#fff" }}
                >
                  {expenses.length}
                </span>
              </div>
            </div>
            <div className="tx-item__right tx-item__right--actions">
              <span className="tx-item__amount tx-item__amount--gasto">
                {formatCurrency(total)}
              </span>
              <button
                type="button"
                className="tx-item__edit bolsillo__toggle"
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Ocultar detalle" : "Ver detalle"}
              >
                <svg
                  className={`bolsillo__chevron${open ? " bolsillo__chevron--open" : ""}`}
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="tx-item__bar">
            <div className="tx-item__bar-track">
              <div
                className="tx-item__bar-fill"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className="tx-item__bar-label">{formatCurrency(paid)}</span>
          </div>
        </div>
      </div>
      {open && (
        <div className="bolsillo__body">
          {expenses.length === 0 ? (
            <p className="tx-empty">Sin gastos en esta categoría.</p>
          ) : (
            expenses.map((e) => (
              <ExpenseItem
                key={e.id}
                tx={e}
                category={category}
                source={sourceOf ? sourceOf(e) : null}
                dateLabel={dateLabelOf ? dateLabelOf(e) : null}
                onToggle={onToggle}
                onEdit={onEdit}
                dragMode={itemDragMode}
                dragProps={
                  itemDragMode && itemDragPropsFor
                    ? itemDragPropsFor(e.id)
                    : null
                }
                hideIcon
                showOwnerAvatar={ownerAvatar}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function IncomeItem({
  tx,
  member,
  memberColor,
  memberName,
  dateLabel,
  onEdit,
}) {
  const repeatsUntil = tx.fixed && tx.endMonth;
  return (
    <div className="tx-item tx-item--income">
      <div className="tx-item__row">
        {member?.photo ? (
          <img
            className="tx-item__avatar"
            src={member.photo}
            alt={memberName}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="tx-item__avatar" style={{ background: memberColor }}>
            {memberName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="tx-item__body">
          <p className="tx-item__title">{tx.description}</p>
          <div className="tx-item__subrow">
            {dateLabel && <span className="tx-item__date">{dateLabel}</span>}
            {repeatsUntil && (
              <span className="tx-pill tx-pill--until">
                Hasta {monthKeyLabel(tx.endMonth)}
              </span>
            )}
          </div>
        </div>
        <div className="tx-item__right tx-item__right--actions">
          <span className="tx-item__amount tx-item__amount--income">
            {formatCurrency(tx.amount)}
          </span>
          <button
            type="button"
            className="tx-item__edit"
            onClick={() => onEdit(tx)}
            aria-label="Editar ingreso"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
