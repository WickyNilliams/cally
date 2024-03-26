// this is just a hacky workaround to ensure the global declarations make it into the dts rollup
// they get appended to the end of the file on vite build
declare global {
  interface HTMLElementTagNameMap {
    "calendar-month": InstanceType<typeof CalendarMonth>;
    "calendar-date": InstanceType<typeof CalendarDate>;
    "calendar-range": InstanceType<typeof CalendarRange>;
  }
}
