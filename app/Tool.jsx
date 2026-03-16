"use client";

import { useState, useRef, useCallback } from "react";

let idCounter = 0;
const uid = () => `id_${++idCounter}_${Date.now()}`;

export default function Tool() {
  const [pool, setPool] = useState([]);
  const [rows, setRows] = useState([]);
  const [copied, setCopied] = useState(false);
  const [selectedImgId, setSelectedImgId] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback((files) => {
    const fileArr = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    fileArr.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPool((prev) => [
          ...prev,
          { id: uid(), src: e.target.result, name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const addRow = () =>
    setRows((prev) => [...prev, { rowId: uid(), cells: [] }]);
  const removeRow = (rowId) =>
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));

  // 선택된 이미지를 행에 추가
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

  const removeCell = (rowId, cellId) => {
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? { ...r, cells: r.cells.filter((c) => c.cellId !== cellId) }
          : r,
      ),
    );
  };

  const updateLink = (rowId, cellId, link) => {
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
  };

  const moveCell = (rowId, cellId, dir) => {
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
  };

  const moveRow = (rowId, dir) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.rowId === rowId);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const generateHTML = () => {
    const validRows = rows.filter((r) => r.cells.length > 0);
    if (validRows.length === 0)
      return `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>`;

    const tdStyle = `padding:0;margin:0;line-height:0;vertical-align:top;border:0;`;
    const imgStyle = `display:block;width:100%;vertical-align:top;`;
    const tableStyle = `border-collapse:collapse;border-spacing:0;margin:0;padding:0;width:100%;`;

    let inner = `    <div style="width:100%; max-width:800px; margin:0;">\n`;
    inner += `        <table border="0" cellpadding="0" cellspacing="0" style="${tableStyle}">\n`;
    inner += `            <tbody>\n`;

    rows.forEach((row) => {
      const cells = row.cells
        .map((c) => ({ ...c, img: pool.find((p) => p.id === c.imgId) }))
        .filter((c) => c.img);
      if (cells.length === 0) return;

      if (cells.length === 1) {
        const { img, link } = cells[0];
        const imgTag = `<img src="${img.name}" alt="" style="${imgStyle}">`;
        inner += `                <tr>\n                    <td style="${tdStyle}">\n                        ${link ? `<a href="${link}">${imgTag}</a>` : imgTag}\n                    </td>\n                </tr>\n`;
      } else {
        inner += `                <tr>\n                    <td style="${tdStyle}">\n                        <table border="0" cellpadding="0" cellspacing="0" style="${tableStyle}">\n                            <tr>\n`;
        cells.forEach(({ img, link }) => {
          const imgTag = `<img src="${img.name}" alt="" style="${imgStyle}">`;
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
  };

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: C.panel,
          borderBottom: `1px solid ${C.border}`,
          padding: "11px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
          🧩 이미지 HTML 변환 툴
        </h1>
        {selectedImgId && (
          <div
            style={{
              background: "#1c2d3f",
              border: `1px solid ${C.blue}`,
              borderRadius: 6,
              padding: "4px 12px",
              fontSize: 12,
              color: C.blue,
              fontWeight: 600,
              animation: "pulse 1s infinite",
            }}
          >
            ✅ 이미지 선택됨 — 아래 행의 [+추가] 버튼을 누르세요
          </div>
        )}
        {!selectedImgId && pool.length > 0 && (
          <div style={{ fontSize: 12, color: C.muted }}>
            왼쪽 이미지를 클릭해서 선택 → 원하는 행의 [+추가] 버튼 클릭
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr 300px",
          flex: 1,
          overflow: "hidden",
          height: "calc(100vh - 50px)",
        }}
      >
        {/* ① 이미지 풀 */}
        <div
          style={{
            overflowY: "scroll",
            height: "calc(100vh - 50px)",
            borderRight: `1px solid ${C.border}`,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            ① 이미지 업로드
          </div>

          <div
            style={{
              border: `2px dashed ${C.border}`,
              borderRadius: 8,
              padding: 12,
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 10,
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
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              클릭 또는 드래그 업로드
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

          <div
            style={{
              fontSize: 10,
              color: C.muted,
              marginBottom: 8,
              lineHeight: 1.5,
            }}
          >
            👆 이미지 클릭 → 선택
            <br />→ 오른쪽 행에서 [+추가]
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {pool.map((img, i) => {
              const isSelected = selectedImgId === img.id;
              return (
                <div
                  key={img.id}
                  onClick={() => setSelectedImgId(isSelected ? null : img.id)}
                  style={{
                    position: "relative",
                    borderRadius: 7,
                    overflow: "hidden",
                    cursor: "pointer",
                    border: `2px solid ${isSelected ? C.blue : C.border}`,
                    boxShadow: isSelected ? `0 0 0 2px ${C.blue}44` : "none",
                    transition: "all 0.15s",
                    transform: isSelected ? "scale(0.97)" : "scale(1)",
                  }}
                >
                  <img
                    src={img.src}
                    style={{ width: "100%", display: "block" }}
                  />
                  {/* 번호 */}
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      background: isSelected ? C.blue : "rgba(0,0,0,0.6)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 4,
                      transition: "background 0.15s",
                    }}
                  >
                    {i + 1}
                  </div>
                  {/* 파일명 */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: "rgba(0,0,0,0.65)",
                      padding: "3px 6px",
                      fontSize: 9,
                      color: "#ccc",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {img.name}
                  </div>
                  {/* 선택 오버레이 */}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(56,139,253,0.18)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          background: C.blue,
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 6,
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
              fontSize: 10,
              fontWeight: 700,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            ② 행 배치 & 링크 설정
          </div>

          {rows.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: C.muted,
                fontSize: 13,
              }}
            >
              아래 버튼으로 행을 추가하세요
            </div>
          )}

          {rows.map((row, ri) => (
            <div
              key={row.rowId}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                marginBottom: 10,
                overflow: "hidden",
              }}
            >
              {/* Row Header */}
              <div
                style={{
                  background: C.panel,
                  padding: "7px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.muted,
                    flex: 1,
                  }}
                >
                  행 {ri + 1}
                </span>
                {/* 선택된 이미지가 있을 때 +추가 버튼 강조 */}
                <button
                  onClick={() => addImgToRow(row.rowId)}
                  style={{
                    background: selectedImgId ? C.blue : C.card,
                    border: `1px solid ${selectedImgId ? C.blue : C.border}`,
                    color: selectedImgId ? "#fff" : C.muted,
                    borderRadius: 5,
                    padding: "4px 10px",
                    cursor: selectedImgId ? "pointer" : "default",
                    fontSize: 11,
                    fontWeight: 700,
                    transition: "all 0.15s",
                    boxShadow: selectedImgId ? `0 0 8px ${C.blue}66` : "none",
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
                    borderRadius: 5,
                    padding: "4px 7px",
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
                    borderRadius: 5,
                    padding: "4px 7px",
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
                    borderRadius: 5,
                    padding: "4px 7px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Cells */}
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
                      fontSize: 11,
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
                        style={{ flexShrink: 0, width: 100 }}
                      >
                        <div style={{ position: "relative" }}>
                          <img
                            src={img.src}
                            style={{
                              width: "100%",
                              display: "block",
                              borderRadius: 4,
                            }}
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
                              fontSize: 10,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                          <button
                            onClick={() => moveCell(row.rowId, cell.cellId, -1)}
                            style={{
                              flex: 1,
                              background: C.card,
                              border: `1px solid ${C.border}`,
                              color: C.text,
                              borderRadius: 4,
                              padding: "2px 0",
                              cursor: "pointer",
                              fontSize: 10,
                            }}
                            disabled={ci === 0}
                          >
                            ◀
                          </button>
                          <button
                            onClick={() => moveCell(row.rowId, cell.cellId, 1)}
                            style={{
                              flex: 1,
                              background: C.card,
                              border: `1px solid ${C.border}`,
                              color: C.text,
                              borderRadius: 4,
                              padding: "2px 0",
                              cursor: "pointer",
                              fontSize: 10,
                            }}
                            disabled={ci === row.cells.length - 1}
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
                            border: `1px solid ${cell.link ? C.green : C.border}`,
                            borderRadius: 4,
                            padding: "3px 5px",
                            color: C.text,
                            fontSize: 9,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
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

          <button
            onClick={addRow}
            style={{
              width: "100%",
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
            + 새 행 추가
          </button>
        </div>

        {/* ③ 미리보기 + HTML */}
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
                fontSize: 10,
                fontWeight: 700,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: 1,
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
                    fontSize: 12,
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
                  if (cells.length === 0) return null;
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
                            position: "relative",
                            cursor: link ? "pointer" : "default",
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
                                  fontSize: 10,
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
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 1,
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
                  padding: "6px 12px",
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
                minHeight: 250,
                width: "100%",
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: "#79c0ff",
                fontSize: 10,
                padding: 10,
                fontFamily: "monospace",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                marginTop: 8,
                fontSize: 10,
                color: C.muted,
                lineHeight: 1.6,
                background: C.card,
                borderRadius: 6,
                padding: 8,
              }}
            >
              💡 이미지 src는 <span style={{ color: "#ffa657" }}>파일명</span>
              으로 표시됩니다.
              <br />
              퍼스트몰에 올린 후{" "}
              <span style={{ color: C.blue }}>실제 서버 URL로 교체</span>하세요.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
