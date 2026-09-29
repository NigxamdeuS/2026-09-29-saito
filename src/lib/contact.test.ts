import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTextContent,
  MAX_FILE_BYTES,
  MAX_FILES,
  safeFileName,
  validateFields,
  validateFileList,
} from "@/lib/contact";

describe("お問い合わせの入力チェック", () => {
  it("メールアドレスと内容がそろえば通る", () => {
    assert.deepEqual(validateFields({ name: "", email: "a@example.com", message: "こんにちは" }), {});
  });

  it("メールアドレスの抜けや形式の誤りを知らせる", () => {
    assert.ok(validateFields({ name: "", email: "", message: "x" }).email);
    assert.ok(validateFields({ name: "", email: "a@b", message: "x" }).email);
    assert.ok(validateFields({ name: "", email: "a@example.com", message: "" }).message);
  });
});

describe("添付ファイルのチェック", () => {
  it("複数のテキストファイルを受け付ける", () => {
    const files = [
      { name: "a.txt", size: 10 },
      { name: "b.md", size: 20 },
      { name: "c.CSV", size: 30 },
    ];
    assert.equal(validateFileList(files), null);
  });

  it("個数・拡張子・サイズの上限を守る", () => {
    const many = Array.from({ length: MAX_FILES + 1 }, (_, i) => ({ name: `${i}.txt`, size: 1 }));
    assert.equal(validateFileList(many.slice(0, MAX_FILES)), null);
    assert.match(validateFileList(many) ?? "", new RegExp(`${MAX_FILES}個まで`));
    assert.match(validateFileList([{ name: "photo.png", size: 1 }]) ?? "", /テキストファイルではありません/);
    assert.match(validateFileList([{ name: "empty.txt", size: 0 }]) ?? "", /空のファイル/);
    assert.match(validateFileList([{ name: "big.txt", size: MAX_FILE_BYTES + 1 }]) ?? "", /大きすぎます/);
    const heavy = Array.from({ length: 6 }, (_, i) => ({ name: `${i}.txt`, size: MAX_FILE_BYTES }));
    assert.match(validateFileList(heavy) ?? "", /合計/);
  });

  it("中身が UTF-8 のテキストかを確かめる", () => {
    assert.equal(isTextContent(new TextEncoder().encode("日本語のテキスト")), true);
    assert.equal(isTextContent(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00])), false);
    assert.equal(isTextContent(new Uint8Array([0xff, 0xfe, 0x41])), false);
  });

  it("保存名からパスの要素を取り除く", () => {
    assert.equal(safeFileName("../../etc/passwd.txt", 0), "01-passwd.txt");
    assert.equal(safeFileName("..\\secret.md", 2), "03-secret.md");
    assert.equal(safeFileName("a:b?.txt", 9), "10-a_b_.txt");
  });
});
