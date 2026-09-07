const paths = {
  fire: "M12 3c1 5-4 5-4 9 0 2 1 3 2 3-1-3 3-3 3-6 4 3 6 6 4 9a6 6 0 0 1-10 0C3 12 8 10 8 6c1 1 2 1 4-3Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  pack: "M8 7V5a4 4 0 0 1 8 0v2M7 7h10a3 3 0 0 1 3 3v10H4V10a3 3 0 0 1 3-3Zm0 7h10v6M8 11h.01M16 11h.01",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  book: "M4 3h13a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3V3Zm0 14a3 3 0 0 1 3-3h13M8 6h8M8 10h5",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  leaf: "M20 3c-9 0-16 3-16 10a6 6 0 0 0 6 6c7 0 10-7 10-16ZM3 21 15 9",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  download: "M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5",
  check: "m5 12 4 4L19 6",
  lock: "M6 10h12v11H6V10Zm2 0V6a4 4 0 0 1 8 0v4",
  flag: "M5 21V3m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0",
  sound: "M11 4 6 8H3v8h3l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
};
export default function Icon({ name, size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.leaf} />
    </svg>
  );
}
