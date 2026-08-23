type AssetIconProps = {
  symbol: string;
  iconUrl?: string | null;
  size?: number;
  className?: string;
};

export function AssetIcon({ symbol, iconUrl, size = 36, className }: AssetIconProps) {
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt={symbol}
        width={size}
        height={size}
        className={`rounded-full bg-surface-2 object-cover ${className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-semibold ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.32) }}
    >
      {symbol.slice(0, 3)}
    </span>
  );
}
