/**
 * Parse API response into structured format
 * @param {string} text - Raw API response text
 * @returns {{ soap: object, plan: object }}
 */
export function parseApiResponse(text) {
  const initialSoap = {
    s: '',
    o: '',
    a: {
      症状推移: '',
      リスク評価: '',
      背景要因: '',
      次回観察ポイント: '',
    },
    p: {
      本日実施した援助: '',
      次回以降の方針: '',
    },
  };

  const initialPlan = {
    長期目標: '',
    短期目標: '',
    看護援助の方針: '',
  };

  if (!text) {
    return { soap: initialSoap, plan: initialPlan };
  }

  const normalized = text.replace(/\r\n/g, '\n').trim();

  // Remove visit information section (【訪問情報】) from the response if present
  const visitInfoPattern = /【訪問情報】[\s\S]*?(?=\n\s*【|###|$)/i;
  const cleanedText = normalized.replace(visitInfoPattern, '').trim();

  // Split SOAP and Plan sections
  const planMarker1 = '### 訪問看護計画書';
  const planMarker2 = '【看護計画書】';
  let soapText = cleanedText;
  let planText = '';

  let markerIndex = -1;
  if (cleanedText.includes(planMarker1)) {
    markerIndex = cleanedText.indexOf(planMarker1);
    soapText = cleanedText.slice(0, markerIndex).trim();
    planText = cleanedText.slice(markerIndex + planMarker1.length).trim();
  } else if (cleanedText.includes(planMarker2)) {
    markerIndex = cleanedText.indexOf(planMarker2);
    soapText = cleanedText.slice(0, markerIndex).trim();
    planText = cleanedText.slice(markerIndex + planMarker2.length).trim();
  }

  // Parse S
  const sMatch =
    soapText.match(/\*\*S[（(]主観[）)]\*\*\s*\n+([\s\S]+?)(?=\n\s*\*\*O[（(]客観[）)]\*\*|$)/i) ||
    soapText.match(/S[（(]主観[）)]\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*O[（(]客観[）)])|$)/);
  if (sMatch) {
    initialSoap.s = sMatch[1].trim();
  }

  // Parse O
  const oMatch =
    soapText.match(/\*\*O[（(]客観[）)]\*\*\s*\n+([\s\S]+?)(?=\n\s*\*\*A[（(]アセスメント[）)]\*\*|$)/i) ||
    soapText.match(/O[（(]客観[）)]\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*A[（(]アセスメント[）)])|$)/);
  if (oMatch) {
    initialSoap.o = oMatch[1].trim();
  }

  // Parse A with sub-sections
  const aMatch =
    soapText.match(/\*\*A[（(]アセスメント[）)]\*\*\s*\n+([\s\S]+?)(?=\n\s*###\s*P[（(]計画[）)]|\n\s*\*\*P[（(]計画[）)]\*\*|$)/i) ||
    soapText.match(/A[（(]アセスメント[）)]\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*P[（(]計画[）)])|$)/);
  if (aMatch) {
    const aContent = aMatch[1];

    const symptomMatch = aContent.match(/【症状推移】\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*【リスク評価)|$)/);
    if (symptomMatch) {
      initialSoap.a.症状推移 = symptomMatch[1].trim();
    }

    const riskMatch = aContent.match(/【リスク評価[（(]自殺[・・]他害[・・]服薬[）)]】\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*【背景要因)|$)/);
    if (riskMatch) {
      initialSoap.a.リスク評価 = riskMatch[1].trim();
    }

    const backgroundMatch = aContent.match(/【背景要因】\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*【次回観察ポイント)|$)/);
    if (backgroundMatch) {
      initialSoap.a.背景要因 = backgroundMatch[1].trim();
    }

    const observationMatch = aContent.match(/【次回観察ポイント】\s*[:：]?\s*\n+([\s\S]+?)(?=\n\s*###\s*P[（(]計画[）)]|\n\s*\*\*P[（(]計画[）)]\*\*|$)/);
    if (observationMatch) {
      initialSoap.a.次回観察ポイント = observationMatch[1].trim();
    }

    // Fallback
    if (!Object.values(initialSoap.a).some((v) => v)) {
      initialSoap.a.症状推移 = aContent.trim();
    }
  }

  // Parse P with sub-sections
  const pMatch =
    soapText.match(/###\s*P[（(]計画[）)]\s*\n+([\s\S]+?)(?=\n\s*---|\n\s*###\s*訪問看護計画書|\n\s*【看護計画書】|$)/i) ||
    soapText.match(/\*\*P[（(]計画[）)]\*\*\s*\n+([\s\S]+?)(?=\n\s*---|\n\s*###\s*訪問看護計画書|\n\s*【看護計画書】|$)/i) ||
    soapText.match(/P[（(]計画[）)]\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*【看護計画書】)|$)/);
  if (pMatch) {
    let pContent = pMatch[1];
    pContent = pContent.replace(/【訪問情報】[\s\S]*?(?=\n\s*【|###|$)/i, '').trim();

    const todayMatch =
      pContent.match(/\*\*【本日実施した援助】\*\*\s*\n+([\s\S]+?)(?=\n\s*\*\*【次回以降の方針】|$)/) ||
      pContent.match(/【本日実施した援助】\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*【次回以降の方針)|$)/);
    if (todayMatch) {
      initialSoap.p.本日実施した援助 = todayMatch[1].trim();
    }

    const futureMatch =
      pContent.match(/\*\*【次回以降の方針】\*\*\s*\n+([\s\S]+?)(?=\n\s*---|\n\s*###\s*訪問看護計画書|\n\s*【看護計画書】|$)/) ||
      pContent.match(/【次回以降の方針】\s*[:：]?\s*\n+([\s\S]+?)(?=(\n\s*---|\n\s*###\s*訪問看護計画書|\n\s*【看護計画書】)|$)/);
    if (futureMatch) {
      initialSoap.p.次回以降の方針 = futureMatch[1].trim();
    }

    // Fallback
    if (!Object.values(initialSoap.p).some((v) => v)) {
      initialSoap.p.本日実施した援助 = pContent.trim();
    }
  }

  // Parse Plan sections
  let planContent = planText.replace(/\*\*【看護計画書】\*\*\s*\n*/g, '').trim();
  planContent = planContent.replace(/【訪問情報】[\s\S]*?(?=\n\s*【|###|$)/i, '').trim();

  const cleanContent = (text) => {
    return text
      .replace(/\*\*/g, '')
      .replace(/\*\*短期目標\s*[:：]\*\*/gi, '')
      .replace(/\*\*看護援助の方針\s*[:：]\*\*/gi, '')
      .replace(/【短期目標】/g, '')
      .replace(/【看護援助の方針】/g, '')
      .replace(/短期目標\s*[:：]/g, '')
      .replace(/看護援助の方針\s*[:：]/g, '')
      .trim();
  };

  const longTermMatch =
    planContent.match(/【長期目標】\s*\n+([\s\S]+?)(?=\n\s*【短期目標】|\n\s*\*\*短期目標|\n\s*短期目標\s*[:：]|$)/i) ||
    planContent.match(/長期目標\s*[:：]\s*\n+([\s\S]+?)(?=\n\s*【短期目標】|\n\s*\*\*短期目標|\n\s*短期目標\s*[:：]|$)/) ||
    planContent.match(/\*\*長期目標\s*[:：]\*\*\s*\n+([\s\S]+?)(?=\n\s*【短期目標】|\n\s*\*\*短期目標|\n\s*短期目標\s*[:：]|$)/i);
  if (longTermMatch) {
    initialPlan.長期目標 = cleanContent(longTermMatch[1]);
  }

  const shortTermMatch =
    planContent.match(/【短期目標】\s*\n+([\s\S]+?)(?=\n\s*【看護援助の方針】|\n\s*\*\*看護援助の方針|\n\s*看護援助の方針\s*[:：]|$)/i) ||
    planContent.match(/短期目標\s*[:：]\s*\n+([\s\S]+?)(?=\n\s*【看護援助の方針】|\n\s*\*\*看護援助の方針|\n\s*看護援助の方針\s*[:：]|$)/) ||
    planContent.match(/\*\*短期目標\s*[:：]\*\*\s*\n+([\s\S]+?)(?=\n\s*【看護援助の方針】|\n\s*\*\*看護援助の方針|\n\s*看護援助の方針\s*[:：]|$)/i);
  if (shortTermMatch) {
    initialPlan.短期目標 = cleanContent(shortTermMatch[1]);
  }

  const policyMatch =
    planContent.match(/【看護援助の方針】\s*\n+([\s\S]+?)(?=\n\s*---|\n\s*【訪問情報】|\n\s*【長期目標】|$)/i) ||
    planContent.match(/看護援助の方針\s*[:：]\s*\n+([\s\S]+?)(?=\n\s*---|\n\s*【訪問情報】|\n\s*【長期目標】|$)/) ||
    planContent.match(/\*\*看護援助の方針\s*[:：]\*\*\s*\n+([\s\S]+?)(?=\n\s*---|\n\s*【訪問情報】|\n\s*【長期目標】|$)/i);
  if (policyMatch) {
    initialPlan.看護援助の方針 = cleanContent(policyMatch[1]);
  }

  return { soap: initialSoap, plan: initialPlan };
}


