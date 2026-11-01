/**
 * Hero illustration for the debtors dashboard: a pharmacist behind the
 * counter taking cash for drugs bought on credit.
 *
 * Drawn as flat shapes in the app's own palette rather than an imported
 * asset, so it scales cleanly and can never drift out of the design system.
 */
export function PharmacistCash({ className = '' }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      role="img"
      aria-label="A pharmacist collecting cash over the counter"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* backdrop */}
      <rect width="320" height="240" rx="20" fill="#EBF2FF" />
      <circle cx="160" cy="102" r="88" fill="#C3D6F7" />

      {/* counter */}
      <rect x="16" y="170" width="288" height="70" rx="14" fill="#1A56DB" />
      <rect x="16" y="162" width="288" height="16" rx="8" fill="#1240A8" />

      {/* loose change on the counter */}
      <circle cx="96" cy="172" r="7" fill="#FACC15" />
      <circle cx="110" cy="176" r="7" fill="#FBBF24" />

      {/* pill bottle waiting to be handed over */}
      <g>
        <rect x="40" y="124" width="36" height="14" rx="5" fill="#1240A8" />
        <rect x="44" y="136" width="28" height="26" rx="7" fill="#F97316" />
        <rect x="49" y="143" width="18" height="12" rx="3" fill="#FFFFFF" />
        <path d="M56 145h4v8h-4z M54 147h8v4h-8z" fill="#F97316" />
      </g>

      {/* pharmacist */}
      <g>
        {/* lab coat */}
        <path d="M96 170v-52c0-14 10-22 26-24h36c16 2 26 10 26 24v52z" fill="#FFFFFF" />
        <path d="M158 94h-6c-16 2-26 10-26 24v52h32z" fill="#F1F5F9" />
        {/* lapels */}
        <path d="M140 94l-13 4 9 13z" fill="#CBD5E1" />
        <path d="M140 94l13 4-9 13z" fill="#E2E8F0" />
        {/* name badge */}
        <rect x="104" y="122" width="26" height="10" rx="3" fill="#1A56DB" />
        {/* head */}
        <circle cx="140" cy="66" r="26" fill="#E8AE85" />
        <path d="M114 62c0-18 12-28 26-28s26 10 26 28c0-10-8-15-26-15s-26 5-26 15z" fill="#2F3B52" />
        <circle cx="132" cy="66" r="2.8" fill="#2F3B52" />
        <circle cx="148" cy="66" r="2.8" fill="#2F3B52" />
        <path d="M134 76c3 3 9 3 12 0" stroke="#2F3B52" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </g>

      {/* arm out to take the money */}
      <path d="M180 122l58 22" stroke="#FFFFFF" strokeWidth="26" strokeLinecap="round" />
      <rect x="228" y="129" width="12" height="28" rx="5" fill="#E2E8F0" transform="rotate(20.8 234 143)" />
      <circle cx="244" cy="146" r="12" fill="#E8AE85" />

      {/* naira notes */}
      <g transform="rotate(-14 252 124)">
        <rect x="216" y="104" width="72" height="40" rx="5" fill="#15803D" />
        <rect x="222" y="110" width="60" height="28" rx="3" fill="#22C55E" />
        <circle cx="252" cy="124" r="9" fill="#15803D" opacity="0.5" />
        <text
          x="252"
          y="129"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#DCFCE7"
          fontFamily="'Poppins', 'Noto Sans', sans-serif"
        >
          ₦
        </text>
      </g>
    </svg>
  )
}
