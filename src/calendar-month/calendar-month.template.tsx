/** @jsxImportSource ../core/jsx-html */

// this module is a pure string computation: it is evaluated at build time
// and replaced by its exported string literals (see precompile-templates.mjs)

/** column header for one weekday */
export const dayHeaderHtml: string = (
  <th part="th day" scope="col">
    <span class="vh"></span>
    <span aria-hidden="true"></span>
  </th>
);

/** one of the 6 possible week rows */
export const weekRowHtml: string = (
  <tr part="tr week">
    <th class="num" part="th weeknumber" scope="row"></th>
    {Array.from({ length: 7 }, () => (
      <td part="td">
        <button class="num"></button>
      </td>
    ))}
  </tr>
);

/**
 * the month shell. `$days`/`$weeks` are markers the component substitutes
 * with repeated {@link dayHeaderHtml}/{@link weekRowHtml}, so the repetition
 * isn't expanded into the precompiled string
 */
export const monthHtml: string = (
  <>
    <calendar-heading month="long" id="h" class="vh"></calendar-heading>
    <slot name="heading" part="heading">
      <calendar-heading month="long" aria-hidden="true"></calendar-heading>
    </slot>
    <table aria-labelledby="h" part="table">
      <colgroup>
        <col part="col-weeknumber" />
        {Array.from({ length: 7 }, (_, i) => (
          <col part={`col-${i + 1}`} />
        ))}
      </colgroup>
      <thead>
        <tr part="tr head">
          <th part="th weeknumber">
            <slot name="weeknumber">
              <span class="vh">Week</span>
              <span aria-hidden="true">#</span>
            </slot>
          </th>
          {"$days"}
        </tr>
      </thead>
      <tbody>{"$weeks"}</tbody>
    </table>
  </>
);
