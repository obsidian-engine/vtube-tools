/**
 * ExtendedStyle Value Object
 * スタイル設定を管理するドメインモデル
 */
export class ExtendedStyle {
  constructor({
    fontFamily = "Arial",
    fontSize = 48,
    color = "#FFFFFF",
    backgroundColor = null,
    shadow = null,
    stroke = null,
    position = { x: 50, y: 50, align: "center" },
    lineHeight = 1.2,
    letterSpacing = 0,
  } = {}) {
    this.fontFamily = fontFamily;
    this.fontSize = fontSize;
    this.color = color;
    this.backgroundColor = backgroundColor;
    this.shadow = shadow;
    this.stroke = stroke;
    this.position = position;
    this.lineHeight = lineHeight;
    this.letterSpacing = letterSpacing;
  }

  /**
   * シャドウ設定を追加/更新
   */
  withShadow(color, blur, offsetX, offsetY) {
    return new ExtendedStyle({
      ...this,
      shadow: { color, blur, offsetX, offsetY },
    });
  }

  /**
   * ストローク設定を追加/更新
   */
  withStroke(color, width) {
    return new ExtendedStyle({
      ...this,
      stroke: { color, width },
    });
  }

  /**
   * 位置設定を更新
   */
  withPosition(x, y, align = "center") {
    return new ExtendedStyle({
      ...this,
      position: { x, y, align },
    });
  }

  /**
   * CSS textShadow文字列を生成
   */
  getTextShadowCSS() {
    if (!this.shadow) return "none";
    const { offsetX, offsetY, blur, color } = this.shadow;
    return `${offsetX}px ${offsetY}px ${blur}px ${color}`;
  }

  /**
   * CSS strokeスタイルを生成（WebKit用）
   */
  getStrokeCSS() {
    if (!this.stroke) return {};
    return {
      "-webkit-text-stroke": `${this.stroke.width}px ${this.stroke.color}`,
    };
  }

  /**
   * 位置指定のCSS値を生成
   */
  getPositionCSS() {
    const { x, y, align } = this.position;
    const transform =
      align === "center"
        ? "translate(-50%, -50%)"
        : align === "left"
          ? "translateY(-50%)"
          : "translate(-100%, -50%)";

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform,
    };
  }

  /**
   * 完全なCSSスタイルオブジェクトを生成
   */
  toCSS() {
    return {
      fontFamily: this.fontFamily,
      fontSize: `${this.fontSize}px`,
      color: this.color,
      backgroundColor: this.backgroundColor || "transparent",
      textShadow: this.getTextShadowCSS(),
      ...this.getStrokeCSS(),
      ...this.getPositionCSS(),
      lineHeight: this.lineHeight,
      letterSpacing: `${this.letterSpacing}px`,
    };
  }

  /**
   * Firebaseに保存する形式に変換
   */
  toFirestore() {
    return {
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      color: this.color,
      backgroundColor: this.backgroundColor,
      shadow: this.shadow,
      stroke: this.stroke,
      position: this.position,
      lineHeight: this.lineHeight,
      letterSpacing: this.letterSpacing,
    };
  }

  /**
   * Firestoreデータから復元
   */
  static fromFirestore(data) {
    if (!data) return new ExtendedStyle();
    return new ExtendedStyle(data);
  }

  /**
   * 既存のtextShadow文字列からシャドウ設定を抽出（マイグレーション用）
   */
  static parseTextShadow(textShadow) {
    if (!textShadow || textShadow === "none") return null;

    // "2px 2px 4px rgba(0, 0, 0, 0.8)" 形式をパース
    const match = textShadow.match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(.+)/);
    if (!match) return null;

    return {
      offsetX: parseInt(match[1]),
      offsetY: parseInt(match[2]),
      blur: parseInt(match[3]),
      color: match[4],
    };
  }
}
