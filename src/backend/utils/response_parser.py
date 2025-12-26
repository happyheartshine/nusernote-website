"""Parser utility to parse AI-generated SOAP and Plan output."""

import re
from typing import Dict, Any


def parse_soap_response(text: str) -> Dict[str, Dict[str, Any]]:
    """
    Parse AI-generated response into structured SOAP and Plan format.
    
    Args:
        text: Raw AI-generated text response
        
    Returns:
        Dictionary with 'soap' and 'plan' keys containing structured data
    """
    # Initialize default structures
    soap_output = {
        "s": "",
        "o": "",
        "a": {
            "症状推移": "",
            "リスク評価": "",
            "背景要因": "",
            "次回観察ポイント": "",
        },
        "p": {
            "本日実施した援助": "",
            "次回以降の方針": "",
        },
    }
    
    plan_output = {
        "長期目標": "",
        "短期目標": "",
        "看護援助の方針": "",
    }
    
    if not text:
        return {"soap": soap_output, "plan": plan_output}
    
    # Normalize line endings
    normalized = text.replace("\r\n", "\n").strip()
    
    # Remove visit information section if present
    visit_info_pattern = r"【訪問情報】[\s\S]*?(?=\n\s*【|###|$)"
    cleaned_text = re.sub(visit_info_pattern, "", normalized, flags=re.IGNORECASE).strip()
    
    # Split SOAP and Plan sections
    plan_marker1 = "### 訪問看護計画書"
    plan_marker2 = "【看護計画書】"
    soap_text = cleaned_text
    plan_text = ""
    
    if plan_marker1 in cleaned_text:
        marker_index = cleaned_text.index(plan_marker1)
        soap_text = cleaned_text[:marker_index].strip()
        plan_text = cleaned_text[marker_index + len(plan_marker1):].strip()
    elif plan_marker2 in cleaned_text:
        marker_index = cleaned_text.index(plan_marker2)
        soap_text = cleaned_text[:marker_index].strip()
        plan_text = cleaned_text[marker_index + len(plan_marker2):].strip()
    
    # Parse S (Subjective)
    s_patterns = [
        r"\*\*S[（(]主観[）)]\*\*\s*\n+([\s\S]+?)(?=\n\s*\*\*O[（(]客観[）)]\*\*|$)",
        r"S[（(]主観[）)]\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*O[（(]客観[）)])|$)",
    ]
    for pattern in s_patterns:
        match = re.search(pattern, soap_text, re.IGNORECASE)
        if match:
            soap_output["s"] = match.group(1).strip()
            break
    
    # Parse O (Objective)
    o_patterns = [
        r"\*\*O[（(]客観[）)]\*\*\s*\n+([\s\S]+?)(?=\n\s*\*\*A[（(]アセスメント[）)]\*\*|$)",
        r"O[（(]客観[）)]\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*A[（(]アセスメント[）)])|$)",
    ]
    for pattern in o_patterns:
        match = re.search(pattern, soap_text, re.IGNORECASE)
        if match:
            soap_output["o"] = match.group(1).strip()
            break
    
    # Parse A (Assessment) with sub-sections
    a_patterns = [
        r"\*\*A[（(]アセスメント[）)]\*\*\s*\n+([\s\S]+?)(?=\n\s*###\s*P[（(]計画[）)]|\n\s*\*\*P[（(]計画[）)]\*\*|$)",
        r"A[（(]アセスメント[）)]\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*P[（(]計画[）)])|$)",
    ]
    a_content = ""
    for pattern in a_patterns:
        match = re.search(pattern, soap_text, re.IGNORECASE)
        if match:
            a_content = match.group(1)
            break
    
    if a_content:
        # Parse A sub-sections
        sections = {
            "症状推移": r"【症状推移】\s*\n+([\s\S]+?)(?=\n\s*【|$)",
            "リスク評価": r"【リスク評価[（(]自殺・他害・服薬[）)]?】\s*\n+([\s\S]+?)(?=\n\s*【|$)",
            "背景要因": r"【背景要因】\s*\n+([\s\S]+?)(?=\n\s*【|$)",
            "次回観察ポイント": r"【次回観察ポイント】\s*\n+([\s\S]+?)(?=\n\s*【|$)",
        }
        
        for key, pattern in sections.items():
            match = re.search(pattern, a_content, re.IGNORECASE)
            if match:
                soap_output["a"][key] = match.group(1).strip()
    
    # Parse P (Plan) with sub-sections
    p_patterns = [
        r"###\s*P[（(]計画[）)]\s*\n+([\s\S]+?)(?=\n\s*###\s*訪問看護計画書|\n\s*【看護計画書】|$)",
        r"\*\*P[（(]計画[）)]\*\*\s*\n+([\s\S]+?)(?=\n\s*###\s*訪問看護計画書|\n\s*【看護計画書】|$)",
        r"P[（(]計画[）)]\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*訪問看護計画書|\n\s*【看護計画書】)|$)",
    ]
    p_content = ""
    for pattern in p_patterns:
        match = re.search(pattern, soap_text, re.IGNORECASE)
        if match:
            p_content = match.group(1)
            break
    
    if p_content:
        # Parse P sub-sections
        p_sections = {
            "本日実施した援助": r"\*\*【本日実施した援助】\*\*\s*\n+([\s\S]+?)(?=\n\s*\*\*【次回以降の方針】\*\*|\n\s*【次回以降の方針】|\n\s*---|\n\s*###\s*訪問看護計画書|\n\s*【看護計画書】|$)",
            "次回以降の方針": r"\*\*【次回以降の方針】\*\*\s*\n+([\s\S]+?)(?=\n\s*---|\n\s*###\s*訪問看護計画書|\n\s*【看護計画書】|$)",
        }
        
        for key, pattern in p_sections.items():
            match = re.search(pattern, p_content, re.IGNORECASE)
            if not match:
                # Fall back to plain format without markdown bold
                if key == "本日実施した援助":
                    fallback_pattern = r"【本日実施した援助】\s*\n+([\s\S]+?)(?=\n\s*【次回以降の方針】|\n\s*---|\n\s*###\s*訪問看護計画書|\n\s*【看護計画書】|$)"
                else:
                    fallback_pattern = r"【次回以降の方針】\s*\n+([\s\S]+?)(?=\n\s*---|\n\s*###\s*訪問看護計画書|\n\s*【看護計画書】|$)"
                match = re.search(fallback_pattern, p_content, re.IGNORECASE)
            
            if match:
                content = match.group(1).strip()
                # Remove trailing separators like ---
                content = re.sub(r'\n\s*---\s*$', '', content).strip()
                soap_output["p"][key] = content
    
    # Parse Plan section
    if plan_text:
        # Define plan section keys in order
        plan_keys = ["長期目標", "短期目標", "看護援助の方針"]
        
        for i, key in enumerate(plan_keys):
            # Try markdown bold format first (**長期目標：**)
            # Look for next section marker or end of text
            if i + 1 < len(plan_keys):
                next_key = plan_keys[i + 1]
                # Pattern stops at next bold section or end
                bold_pattern = rf"\*\*{key}[:：]\*\*\s*\n+([\s\S]+?)(?=\n\s*\*\*{next_key}[:：]\*\*|$)"
            else:
                # Last section - stop at end or other markers
                bold_pattern = rf"\*\*{key}[:：]\*\*\s*\n+([\s\S]+?)(?=\n\s*【|$)"
            
            match = re.search(bold_pattern, plan_text, re.IGNORECASE)
            
            if not match:
                # Fall back to plain format (長期目標：)
                if i + 1 < len(plan_keys):
                    next_key = plan_keys[i + 1]
                    plain_pattern = rf"{key}[:：]\s*\n+([\s\S]+?)(?=\n\s*{next_key}[:：]|$)"
                else:
                    plain_pattern = rf"{key}[:：]\s*\n+([\s\S]+?)(?=\n\s*【|$)"
                match = re.search(plain_pattern, plan_text, re.IGNORECASE)
            
            if match:
                plan_output[key] = match.group(1).strip()
    
    return {"soap": soap_output, "plan": plan_output}

