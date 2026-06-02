"use client";

import { useState, useRef, useCallback } from "react";

let idCounter = 0;
const uid = () => `id_${++idCounter}_${Date.now()}`;

// 파일명에서 숫자를 추출해 자연어 정렬
const naturalSort = (a, b) => {
  const re = /(\d+)/g;
  const aParts = a.name.split(re);
  const bParts = b.name.split(re);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aSeg = aParts[i] || "";
    const bSeg = bParts[i] || "";
    const aNum = parseInt(aSeg, 10);
    const bNum = parseInt(bSeg, 10);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
    } else {
      if (aSeg < bSeg) return -1;
      if (aSeg > bSeg) return 1;
    }
  }
  return 0;
};

export default function Tool() {
  const [pool, setPool] = useState([]);
  const [rows, setRows] = useState([]);
  const [copied, setCopied] = useState(false);
  const [selectedImgId, setSelectedImgId] = useState(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [baseUrlApplied, setBaseUrlApplied] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );

    // 파일명 기준 자연어 정렬
    imageFiles.sort((a, b) => naturalSort({ name: a.name }, { name: b.name }));

    const readers = imageFiles.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) =>
            resolve({ id: uid(), src: e.target.result, name: file.name });
          reader.readAsDataURL(file);
        }),
    );

    Promise.all(readers).then((newImgs) => {
      setPool((prev) => {
        const combined = [...prev, ...newImgs];
        // 전체 pool도 정렬 유지
        combined.sort(naturalSort);
        return combined;
      });
    });
  }, []);

  const addRow = () =>
    setRows((prev) => [...prev, { rowId: uid(), cells: [] }]);

  const removeRow = (rowId) =>
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));

  const handleImgClick = (imgId) => {
    setRows((prev) => [
      ...prev,
      { rowId: uid(), cells: [{ cellId: uid(), imgId, link: "" }] },
    ]);
  };

  const addImgToRow = (rowId) => {
    if (!selectedImgId) return;
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? {
              ...r,
              cells: [
                ...r.cells,
                { cellId: uid(), imgId: selectedImgId, link: "" },
              ],
            }
          : r,
      ),
    );
    setSelectedImgId(null);
  };

  const removeCell = (rowId, cellId) =>
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? { ...r, cells: r.cells.filter((c) => c.cellId !== cellId) }
          : r,
      ),
    );

  const updateLink = (rowId, cellId, link) =>
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? {
              ...r,
              cells: r.cells.map((c) =>
                c.cellId === cellId ? { ...c, link } : c,
              ),
            }
          : r,
      ),
    );

  const moveCell = (rowId, cellId, dir) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        const idx = r.cells.findIndex((c) => c.cellId === cellId);
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= r.cells.length) return r;
        const cells = [...r.cells];
        [cells[idx], cells[newIdx]] = [cells[newIdx], cells[idx]];
        return { ...r, cells };
      }),
    );

  const moveRow = (rowId, dir) =>
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.rowId === rowId);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });

  const getImgSrc = (imgName) => {
    if (!baseUrl.trim()) return imgName;
    return `${baseUrl.trim().replace(/\/$/, "")}/${imgName}`;
  };

  const parseBaseUrl = (url) => {
    if (!url.trim()) return "";
    try {
      const u = new URL(url.trim());
      const parts = u.pathname.split("/");
      parts.pop();
      u.pathname = parts.join("/");
      return u.toString().replace(/\/$/, "");
    } catch {
      const idx = url.trim().lastIndexOf("/");
      return idx > 8 ? url.trim().substring(0, idx) : url.trim();
    }
  };

  const applyBaseUrl = () => {
    const parsed = parseBaseUrl(baseUrl);
    setBaseUrl(parsed);
    setBaseUrlApplied(true);
    setTimeout(() => setBaseUrlApplied(false), 2000);
  };

  const generateHTML = () => {
    const validRows = rows.filter((r) => r.cells.length > 0);
    if (!validRows.length)
      return `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title></title>\n</head>\n<body>\n    \n</body>\n</html>`;

    const tdStyle = `padding:0;margin:0;line-height:0;vertical-align:top;border:0;font-size:0;height:0;`;
    const imgStyle = `display:block;width:100%;vertical-align:top;border:0;line-height:0;height:auto;`;
    const tableStyle = `border-collapse:collapse; border-spacing:0;margin:0 auto;width:100%; max-width:800px;mso-table-lspace:0pt; mso-table-rspace:0pt; line-height:0;`;

    let inner = `    <div style="max-width:800px; margin:0 auto; text-align:center; font-size:0; line-height:0;">\n`;
    inner += `        <table border="0" cellpadding="0" cellspacing="0" style="${tableStyle}">\n            <tbody>\n`;

    rows.forEach((row) => {
      const cells = row.cells
        .map((c) => ({ ...c, img: pool.find((p) => p.id === c.imgId) }))
        .filter((c) => c.img);
      if (!cells.length) return;

      if (cells.length === 1) {
        const { img, link } = cells[0];
        const srcUrl = getImgSrc(img.name);
        const imgTag = `<img src="${srcUrl}" alt="" style="${imgStyle}">`;
        inner += `                <tr>\n                    <td style="${tdStyle}">\n                        ${link ? `<a href="${link}">${imgTag}</a>` : imgTag}\n                    </td>\n                </tr>\n`;
      } else {
        inner += `                <tr>\n                    <td style="${tdStyle}">\n                        <table border="0" cellpadding="0" cellspacing="0" style="${tableStyle}">\n                            <tr>\n`;
        cells.forEach(({ img, link }) => {
          const srcUrl = getImgSrc(img.name);
          const imgTag = `<img src="${srcUrl}" alt="" style="${imgStyle}">`;
          inner += `                                <td style="${tdStyle}">\n                                    ${link ? `<a href="${link}">${imgTag}</a>` : imgTag}\n                                </td>\n`;
        });
        inner += `                            </tr>\n                        </table>\n                    </td>\n                </tr>\n`;
      }
    });

    inner += `            </tbody>\n        </table>\n    </div>`;
    return `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n${inner}\n</body>\n</html>`;
  };

  const copyHTML = () => {
    navigator.clipboard.writeText(generateHTML());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const C = {
    bg: "#0d1117",
    panel: "#161b22",
    card: "#21262d",
    border: "#30363d",
    blue: "#388bfd",
    green: "#3fb950",
    red: "#f85149",
    yellow: "#e3b341",
    text: "#e6edf3",
    muted: "#8b949e",
    purple: "#bc8cff",
  };

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* ── 헤더 ── */}
      <div
        style={{
          background: C.panel,
          borderBottom: `1px solid ${C.border}`,
          padding: "9px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          🧩 이미지 HTML 빌더
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: C.purple,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            🔗 이미지 URL
          </span>
          <input
            type="text"
            placeholder="https://example.com/path/img.png"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            style={{
              flex: 1,
              background: C.bg,
              border: `1px solid ${baseUrl ? C.purple : C.border}`,
              borderRadius: 5,
              padding: "5px 8px",
              color: C.text,
              fontSize: 11,
              outline: "none",
              minWidth: 0,
            }}
          />
          <button
            onClick={applyBaseUrl}
            disabled={!baseUrl.trim()}
            style={{
              background: baseUrl.trim() ? C.purple : C.card,
              border: "none",
              color: baseUrl.trim() ? "#fff" : C.muted,
              borderRadius: 5,
              padding: "5px 10px",
              cursor: baseUrl.trim() ? "pointer" : "default",
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {baseUrlApplied ? "✅ 적용!" : "파일명 분리"}
          </button>
          {baseUrl.trim() && (
            <button
              onClick={() => setBaseUrl("")}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.muted,
                borderRadius: 5,
                padding: "5px 7px",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={copyHTML}
          style={{
            background: copied ? C.green : C.blue,
            border: "none",
            color: "#fff",
            borderRadius: 5,
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "✅ 복사됨!" : "📋 HTML 복사"}
        </button>
      </div>

      {/* ── 서브 힌트 배너 ── */}
      <div
        style={{
          background: baseUrl.trim() ? "#1a1040" : "#0f1e2e",
          borderBottom: `1px solid ${baseUrl.trim() ? "#3d2d6e" : C.border}`,
          padding: "5px 16px",
          fontSize: 11,
          color: C.muted,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {baseUrl.trim() ? (
          <>
            <span style={{ color: C.purple, fontWeight: 600 }}>
              📁 베이스 URL:
            </span>
            <span style={{ color: "#c3a6ff", fontFamily: "monospace" }}>
              {baseUrl.trim().replace(/\/$/, "")}/
            </span>
            <span>+</span>
            <span style={{ color: C.yellow, fontFamily: "monospace" }}>
              파일명
            </span>
            <span style={{ marginLeft: 4 }}>→ src 자동 생성</span>
          </>
        ) : selectedImgId ? (
          <span style={{ color: C.blue, fontWeight: 600 }}>
            ✅ 이미지 선택됨 — 행의 [✚ 여기에 추가] 버튼을 누르거나, 다른
            이미지를 클릭하면 새 행에 추가
          </span>
        ) : (
          <>
            <span
              style={{
                background: "#1c3a5e",
                color: C.blue,
                padding: "1px 7px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              원클릭
            </span>
            이미지 클릭 → 새 행에 바로 추가 &nbsp;·&nbsp; [선택] 버튼 → 기존
            행에 넣기 &nbsp;·&nbsp;
            <span style={{ color: C.green, fontWeight: 600 }}>
              📂 파일명 숫자 순 자동 정렬
            </span>
          </>
        )}
      </div>

      {/* ── 메인 ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr 290px",
          overflow: "hidden",
          height: "100%",
        }}
      >
        {/* ① 이미지 패널 */}
        <div
          style={{
            overflowY: "auto",
            borderRight: `1px solid ${C.border}`,
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            ① 이미지
          </div>

          <div
            style={{
              border: `2px dashed ${C.border}`,
              borderRadius: 8,
              padding: "16px 10px",
              textAlign: "center",
              cursor: "pointer",
              background: C.card,
            }}
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <div style={{ fontSize: 22 }}>📂</div>
            <div
              style={{
                fontSize: 11,
                color: C.muted,
                marginTop: 3,
                lineHeight: 1.4,
              }}
            >
              클릭 또는 드래그 업로드
              <br />
              <span style={{ color: C.green, fontSize: 10 }}>
                파일명 순 자동 정렬
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {pool.map((img, i) => {
              const isSelected = selectedImgId === img.id;
              return (
                <div
                  key={img.id}
                  style={{
                    position: "relative",
                    borderRadius: 7,
                    overflow: "hidden",
                    border: `2px solid ${isSelected ? C.blue : C.border}`,
                    transition: "all 0.15s",
                    transform: isSelected ? "scale(0.97)" : "scale(1)",
                  }}
                >
                  <div
                    onClick={() => {
                      if (isSelected) {
                        setSelectedImgId(null);
                      } else {
                        handleImgClick(img.id);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <img
                      src={img.src}
                      style={{ width: "100%", display: "block" }}
                      alt=""
                    />
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      background: isSelected ? C.blue : "rgba(0,0,0,0.6)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 5px",
                      borderRadius: 4,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: "rgba(0,0,0,0.65)",
                      padding: "3px 6px",
                      fontSize: 10,
                      color: "#ccc",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {img.name}
                  </div>

                  {!isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImgId(img.id);
                      }}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(0,0,0,0.72)",
                        border: `1px solid ${C.border}`,
                        color: C.muted,
                        borderRadius: 4,
                        padding: "1px 6px",
                        cursor: "pointer",
                        fontSize: 9,
                      }}
                    >
                      선택
                    </button>
                  )}

                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(56,139,253,0.18)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <span
                        style={{
                          background: C.blue,
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 5,
                        }}
                      >
                        ✓ 선택됨
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ② 행 배치 */}
        <div
          style={{
            overflowY: "auto",
            borderRight: `1px solid ${C.border}`,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            ② 행 배치 &amp; 링크 설정
          </div>

          {rows.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: C.muted,
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              왼쪽 이미지를 클릭하면
              <br />
              자동으로 행이 추가됩니다
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((row, ri) => (
              <div
                key={row.rowId}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: C.panel,
                    padding: "6px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.muted,
                      flex: 1,
                    }}
                  >
                    행 {ri + 1}
                  </span>
                  <button
                    onClick={() => addImgToRow(row.rowId)}
                    style={{
                      background: selectedImgId ? C.blue : C.card,
                      border: `1px solid ${selectedImgId ? C.blue : C.border}`,
                      color: selectedImgId ? "#fff" : C.muted,
                      borderRadius: 5,
                      padding: "3px 9px",
                      cursor: selectedImgId ? "pointer" : "default",
                      fontSize: 11,
                      fontWeight: 600,
                      boxShadow: selectedImgId ? `0 0 6px ${C.blue}55` : "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedImgId ? "✚ 여기에 추가" : "+ 추가"}
                  </button>
                  <button
                    onClick={() => moveRow(row.rowId, -1)}
                    disabled={ri === 0}
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      borderRadius: 4,
                      padding: "3px 6px",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveRow(row.rowId, 1)}
                    disabled={ri === rows.length - 1}
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      borderRadius: 4,
                      padding: "3px 6px",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeRow(row.rowId)}
                    style={{
                      background: C.red,
                      border: "none",
                      color: "#fff",
                      borderRadius: 4,
                      padding: "3px 7px",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    padding: 8,
                    minHeight: 60,
                    display: "flex",
                    gap: 6,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  {row.cells.length === 0 ? (
                    <div
                      style={{
                        flex: 1,
                        textAlign: "center",
                        color: C.muted,
                        fontSize: 12,
                        padding: "14px 0",
                      }}
                    >
                      {selectedImgId
                        ? "👆 위의 [✚ 여기에 추가] 버튼을 누르세요"
                        : "이미지를 선택 후 추가 버튼 클릭"}
                    </div>
                  ) : (
                    row.cells.map((cell, ci) => {
                      const img = pool.find((p) => p.id === cell.imgId);
                      if (!img) return null;
                      return (
                        <div
                          key={cell.cellId}
                          style={{ flexShrink: 0, width: 96 }}
                        >
                          <div style={{ position: "relative" }}>
                            <img
                              src={img.src}
                              style={{
                                width: "100%",
                                display: "block",
                                borderRadius: 4,
                              }}
                              alt=""
                            />
                            <div
                              style={{
                                position: "absolute",
                                top: 3,
                                left: 3,
                                background: C.blue,
                                color: "#fff",
                                fontSize: 9,
                                fontWeight: 700,
                                padding: "1px 4px",
                                borderRadius: 3,
                              }}
                            >
                              {pool.findIndex((p) => p.id === cell.imgId) + 1}
                            </div>
                            <button
                              onClick={() => removeCell(row.rowId, cell.cellId)}
                              style={{
                                position: "absolute",
                                top: 3,
                                right: 3,
                                background: C.red,
                                border: "none",
                                color: "#fff",
                                borderRadius: 3,
                                width: 16,
                                height: 16,
                                cursor: "pointer",
                                fontSize: 11,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 0,
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <div
                            style={{ display: "flex", gap: 2, marginTop: 3 }}
                          >
                            <button
                              onClick={() =>
                                moveCell(row.rowId, cell.cellId, -1)
                              }
                              disabled={ci === 0}
                              style={{
                                flex: 1,
                                background: C.panel,
                                border: `1px solid ${C.border}`,
                                color: C.text,
                                borderRadius: 3,
                                padding: "2px 0",
                                cursor: "pointer",
                                fontSize: 11,
                              }}
                            >
                              ◀
                            </button>
                            <button
                              onClick={() =>
                                moveCell(row.rowId, cell.cellId, 1)
                              }
                              disabled={ci === row.cells.length - 1}
                              style={{
                                flex: 1,
                                background: C.panel,
                                border: `1px solid ${C.border}`,
                                color: C.text,
                                borderRadius: 3,
                                padding: "2px 0",
                                cursor: "pointer",
                                fontSize: 11,
                              }}
                            >
                              ▶
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="링크 URL"
                            value={cell.link}
                            onChange={(e) =>
                              updateLink(row.rowId, cell.cellId, e.target.value)
                            }
                            style={{
                              width: "100%",
                              marginTop: 3,
                              background: C.bg,
                              border: `1px solid ${
                                cell.link ? C.green : C.border
                              }`,
                              borderRadius: 4,
                              padding: "3px 5px",
                              color: C.text,
                              fontSize: 10,
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                          {baseUrl.trim() && (
                            <div
                              title={getImgSrc(img.name)}
                              style={{
                                fontSize: 9,
                                color: C.purple,
                                marginTop: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              🔗 {getImgSrc(img.name)}
                            </div>
                          )}
                          {cell.link && (
                            <div
                              style={{
                                fontSize: 9,
                                color: C.green,
                                marginTop: 2,
                              }}
                            >
                              🔗 링크됨
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            style={{
              width: "100%",
              marginTop: 8,
              padding: 10,
              background: "transparent",
              border: `1px dashed ${C.border}`,
              color: C.muted,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            + 빈 행 추가
          </button>
        </div>

        {/* ③④ 미리보기 + HTML */}
        <div
          style={{
            overflowY: "auto",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              ③ 미리보기
            </div>
            <div
              style={{
                background: C.card,
                borderRadius: 8,
                overflow: "hidden",
                border: `1px solid ${C.border}`,
              }}
            >
              {rows.filter((r) => r.cells.length > 0).length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: C.muted,
                    fontSize: 11,
                  }}
                >
                  이미지를 배치하면 여기에 표시됩니다
                </div>
              ) : (
                rows.map((row) => {
                  const cells = row.cells
                    .map((c) => ({
                      ...c,
                      img: pool.find((p) => p.id === c.imgId),
                    }))
                    .filter((c) => c.img);
                  if (!cells.length) return null;
                  return (
                    <div
                      key={row.rowId}
                      style={{ display: "flex", lineHeight: 0 }}
                    >
                      {cells.map(({ cellId, img, link }) => (
                        <div
                          key={cellId}
                          style={{
                            flex: 1,
                            cursor: link ? "pointer" : "default",
                            position: "relative",
                          }}
                          onClick={() => link && window.open(link, "_blank")}
                        >
                          <img
                            src={img.src}
                            style={{
                              width: "100%",
                              display: "block",
                              verticalAlign: "top",
                            }}
                            alt=""
                          />
                          {link && (
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(56,139,253,0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: 0,
                                transition: "opacity 0.15s",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.opacity = 1)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.opacity = 0)
                              }
                            >
                              <span
                                style={{
                                  background: "rgba(0,0,0,0.75)",
                                  color: "#fff",
                                  fontSize: 11,
                                  padding: "3px 7px",
                                  borderRadius: 5,
                                }}
                              >
                                🔗
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                ④ HTML 코드
              </div>
              <button
                onClick={copyHTML}
                style={{
                  background: copied ? C.green : C.blue,
                  border: "none",
                  color: "#fff",
                  borderRadius: 5,
                  padding: "5px 12px",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {copied ? "✅ 복사됨!" : "📋 복사"}
              </button>
            </div>
            <textarea
              readOnly
              value={generateHTML()}
              style={{
                flex: 1,
                minHeight: 240,
                width: "100%",
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: "#79c0ff",
                fontSize: 11,
                padding: 10,
                fontFamily: "monospace",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
                lineHeight: 1.5,
              }}
            />
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: C.muted,
                lineHeight: 1.6,
                background: C.card,
                borderRadius: 6,
                padding: "7px 10px",
              }}
            >
              {baseUrl.trim() ? (
                <>
                  <span style={{ color: C.purple }}>🔗 베이스 URL 적용 중</span>{" "}
                  — src가 풀 URL로 생성됩니다.
                  <br />
                  <span
                    style={{
                      color: C.muted,
                      fontFamily: "monospace",
                      fontSize: 10,
                    }}
                  >
                    {baseUrl.trim().replace(/\/$/, "")}/파일명
                  </span>
                </>
              ) : (
                <>
                  💡 이미지 src는{" "}
                  <span style={{ color: "#ffa657" }}>파일명</span>으로
                  표시됩니다.
                  <br />
                  <span style={{ color: C.blue }}>상단에 이미지 URL 입력</span>
                  하면 풀 URL이 자동 생성됩니다.
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
