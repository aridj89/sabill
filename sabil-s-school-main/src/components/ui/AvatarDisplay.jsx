import React from "react";

export default function AvatarDisplay({ avatar, size = 46, style = {} }) {
  const isImage = avatar && avatar.startsWith("data:image");

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size > 40 ? 18 : 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isImage ? "transparent" : "rgba(226,150,58,0.18)",
        border: "1.5px solid rgba(226,150,58,0.45)",
        boxShadow: "0 0 14px rgba(226,150,58,0.25)",
        fontSize: size * 0.55,
        overflow: "hidden",
        flexShrink: 0,
        ...style
      }}
    >
      {isImage ? (
        <img
          src={avatar}
          alt="Avatar"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span>{avatar}</span>
      )}
    </div>
  );
}
