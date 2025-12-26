"""Prompt builder for psychiatric home-visit nursing documentation."""

from utils import (
    format_date_with_weekday,
    format_nurses_list,
    format_time_range,
)


PROMPT_TEMPLATE = """あなたは精神科訪問看護の記録支援に特化したAIアシスタントです。  
以下の情報を基に、SOAP記録と訪問看護計画書を生成してください。

【入力情報】
利用者名：{user_name}
主疾患：{diagnosis}
担当看護師：{nurses}
訪問日：{visit_date_with_weekday}
訪問時間：{visit_time_range}
主訴：{chief_complaint}
S（主観）：{s_text}
O（客観）：{o_text}

────────────────────────
【出力要件】
以下の形式で必ず出力してください。  
プレースホルダー（「出力待ち」「N/A」「特になし」など）は一切使用しないでください。  
各セクション・サブセクションには必ず具体的な内容を含めてください。

────────────────────────
SOAP

S（主観）
{{ここにSの内容を記載。利用者本人の語り口で自然に記述し、複数行でも可}}

O（客観）
{{ここにOの内容を記載。看護師の観察語で客観的に記述し、複数行でも可}}

A（アセスメント）
【症状推移】
{{今日の状態と最近の経過を1〜3文でまとめる。S/O に出てきた症状（気分、不安、睡眠、食欲、希死念慮、活動量、整容、生活状況など）を踏まえて具体的に記述。}}

【リスク評価（自殺・他害・服薬）】
{{S/O に含まれるリスク要素（希死念慮、他害傾向、怠薬、生活リズム乱れ等）を基に1〜3文で分析。リスクが低い場合でも「現時点では高くないと考えられるが、〜には留意が必要である」など臨床的に自然な表現で記述。}}

【背景要因】
{{心理的・生活的背景、ストレス因子、環境要因（睡眠・人間関係・家族状況・生活リズム・活動性など）を1〜3文でまとめる。S/Oの内容に基づいて具体的に推論する。}}

【次回観察ポイント】
{{症状の変化、不安・睡眠・服薬・整容・活動量・生活リズム・対人関係・再燃兆候など、次回訪問で特に確認すべき点を1〜3文で具体的に記載する。}}

P（計画）
【本日実施した援助】
{{本日の訪問で実施した具体的援助（睡眠衛生指導、服薬確認・共有、セルフケア支援、心理的負荷の軽減、環境調整、生活リズム調整、不安への傾聴や整理など）を2〜4文で記述する。必ず具体的な内容を書く。}}

【次回以降の方針】
{{次回以降の援助・観察の方向性（不安・睡眠・服薬管理・生活状況の継続評価、症状変動の観察、セルフケア強化、再燃兆候のモニタリング等）を2〜4文で具体的に記述する。}}

────────────────────────
訪問看護計画書
【看護計画書】

長期目標：
{{1文で利用者の安定した生活・症状管理に向けた具体的な長期目標を書く。}}

短期目標：
{{1〜2文で症状改善や生活リズム、睡眠、服薬管理などに関する短期的目標を書く。}}

看護援助の方針：
{{3〜5文で、精神科訪問看護として行う援助（セルフケア支援、服薬支援、心理教育、再燃兆候の観察、生活リズム調整など）の方針を具体的に記述する。}}

────────────────────────
【訪問情報】
訪問日：{visit_date_formatted}
訪問時間：{visit_time_range}
担当看護師：{nurses_formatted}
主疾患：{diagnosis}

────────────────────────
【重要な注意事項】
- 精神科訪問看護に適した臨床的な日本語で記述すること
- 提供されたSとOの情報を基に記述し、事実を捏造しないこと
- 「〜の可能性」「〜と考えられる」など臨床的曖昧性を許容すること
- 診断名の追加や強い因果関係の断定は避けること
- 不安 → 睡眠 → 生活リズム → 服薬 の優先順位を必要に応じて反映すること
- 以下のような精神科訪問看護で頻出する自然な語彙を使用してよい：
  ・S（主観）例：「気分が落ち込む」「不安で落ち着かない」「寝つきが悪い」「食べる気がしない」「迷惑をかけている気がする」など  
  ・O（客観）例：「表情乏しい」「返答に時間を要する」「室内は概ね整理されている」「活動量低下」「整容不良」「幻聴様の訴えあり」「不眠が持続している」など
- すべてのセクションに必ず具体的な内容を含め、空欄や抽象的表現にしないこと

"""


def build_prompt(
    user_name: str,
    diagnosis: str,
    nurses: list[str],
    visit_date: str,
    start_time: str,
    end_time: str,
    chief_complaint: str,
    s_text: str,
    o_text: str,
) -> str:
    """
    Build the AI prompt with all required fields.
    
    Args:
        user_name: User name
        diagnosis: Primary diagnosis
        nurses: List of nurse names
        visit_date: Visit date in YYYY-MM-DD format
        start_time: Start time in HH:MM format
        end_time: End time in HH:MM format
        chief_complaint: Chief complaint
        s_text: Subjective text
        o_text: Objective text
        
    Returns:
        Complete prompt string
    """
    visit_date_with_weekday = format_date_with_weekday(visit_date)
    visit_date_formatted = format_date_with_weekday(visit_date)
    visit_time_range = format_time_range(start_time, end_time)
    nurses_formatted = format_nurses_list(nurses)
    
    # Sanitize text inputs
    def sanitize(value: str) -> str:
        return value.strip() if value else ""
    
    return PROMPT_TEMPLATE.format(
        user_name=sanitize(user_name),
        diagnosis=sanitize(diagnosis),
        nurses=nurses_formatted if nurses_formatted else "（未指定）",
        visit_date_with_weekday=visit_date_with_weekday,
        visit_time_range=visit_time_range,
        chief_complaint=sanitize(chief_complaint) if sanitize(chief_complaint) else "（特になし）",
        s_text=sanitize(s_text) if sanitize(s_text) else "（記載なし）",
        o_text=sanitize(o_text) if sanitize(o_text) else "（記載なし）",
        visit_date_formatted=visit_date_formatted,
        nurses_formatted=nurses_formatted if nurses_formatted else "（未指定）",
    )

