// Landing Page Content Configuration
// 看護記録AI - Nurse Note AI Landing Page

export const landingContent = {
  // ===== NAVIGATION =====
  nav: {
    logo: '/assets/images/logo-white.svg',
    links: [
      { label: '機能', href: '#features' },
      { label: '使い方', href: '#how-it-works' },
      { label: 'セキュリティ', href: '#security' },
      { label: '料金', href: '#pricing' },
      { label: 'よくある質問', href: '#faq' }
    ],
    cta: {
      primary: { label: 'サインイン', href: '/login' },
      secondary: { label: 'お問い合わせ', href: 'mailto:info@nursenote-ai.jp' }
    }
  },

  // ===== HERO SECTION =====
  hero: {
    headline: '精神科訪問看護の記録を、AIで速く正確に。',
    subhead: '訪問内容の入力から下書き作成、SOAP整形、抜け漏れチェックまで。現場の負担を減らし、品質を上げます。',
    image: '/assets/images/landing/img-header-main.jpg',
    badges: [
      { label: 'AI要約', icon: 'ti ti-brain' },
      { label: 'SOAP対応', icon: 'ti ti-file-text' },
      { label: '監査ログ', icon: 'ti ti-shield-check' }
    ],
    cta: {
      primary: { label: 'サインイン', href: '/login' },
      secondary: { label: '資料請求', href: 'mailto:info@nursenote-ai.jp?subject=資料請求' }
    }
  },

  // ===== TRUST STRIP (under hero) =====
  trustStrip: [
    { icon: 'ti ti-clock', label: '記録時間短縮', value: '最大60%削減' },
    { icon: 'ti ti-shield-check', label: '誤記防止', value: 'AI抜け漏れ検知' },
    { icon: 'ti ti-lock', label: 'セキュリティ', value: '暗号化対応' },
    { icon: 'ti ti-users', label: 'チーム共有', value: 'リアルタイム連携' }
  ],

  // ===== PROBLEM → SOLUTION SECTION =====
  problemSolution: {
    problem: {
      title: '現場の課題',
      items: [
        '記録に時間がかかりすぎて、患者さんとの時間が削られる',
        '記録の抜け漏れやフォーマットの統一が難しい',
        '複数の訪問をまとめて記録すると記憶が曖昧になる',
        '夜遅くまで記録業務が続き、疲弊してしまう'
      ]
    },
    solution: {
      title: 'Nurse Note AIの解決',
      items: [
        'AI要約で記録時間を最大60%削減、患者さんとの時間を確保',
        'SOAP/問題志向記録のテンプレートと抜け漏れチェック',
        '音声入力ですぐに記録、訪問直後に下書き完成',
        'チェックリスト機能で記録品質を標準化、残業時間を削減'
      ]
    },
    stats: [
      { value: 60, unit: '%', label: '記録時間削減' },
      { value: 95, unit: '%', label: '抜け漏れ防止' },
      { value: 40, unit: '分', label: '1日あたり時短' }
    ]
  },

  // ===== FEATURES SECTION =====
  features: [
    {
      icon: 'ti ti-writing',
      title: '記録の自動要約',
      description: '訪問内容を入力すると、AIが看護記録の下書きを自動生成します。',
      image: '/assets/images/landing/service01.jpg',
      headline: 'AIが訪問内容を自動で要約\n記録時間を最大60%削減',
      href: '/dashboard/default',
      tag: 'AI'
    },
    {
      icon: 'ti ti-file-text',
      title: 'SOAPテンプレート',
      description: 'SOAP形式や問題志向記録など、施設に合わせたフォーマットで記録できます。',
      image: '/assets/images/landing/service02.jpg',
      headline: '標準化された記録フォーマット\n施設に合わせてカスタマイズ可能',
      href: '/dashboard/default',
      tag: 'SOAP'
    },
    {
      icon: 'ti ti-microphone',
      title: '音声・テキスト入力',
      description: '音声入力またはテキスト入力、どちらでも自由に記録を作成できます。',
      image: '/assets/images/landing/service03.jpg',
      headline: '訪問直後に音声で記録\n記憶が鮮明なうちに記録を残す',
      href: '/dashboard/default',
      tag: '音声入力'
    },
    {
      icon: 'ti ti-checklist',
      title: 'チェックリスト',
      description: '必須項目の抜け漏れを検知し、記録品質を担保します。',
      image: '/assets/images/landing/service04.jpg',
      headline: '抜け漏れを自動検知\n記録品質を標準化',
      href: '/dashboard/default',
      tag: '品質管理'
    },
    {
      icon: 'ti ti-shield-lock',
      title: '監査ログ・権限管理',
      description: '誰がいつ何を編集したか、すべての操作履歴を記録します。',
      image: '/assets/images/landing/service05.jpg',
      headline: 'すべての操作を記録\n監査対応とセキュリティを両立',
      href: '/dashboard/default',
      tag: 'セキュリティ'
    },

  ],

  // ===== HOW IT WORKS SECTION =====
  howItWorks: {
    title: '使い方はシンプル3ステップ',
    steps: [
      {
        number: '01',
        icon: 'ti ti-edit',
        title: '訪問内容を入力',
        description: '訪問時の観察内容や実施したケアを音声またはテキストで入力します。'
      },
      {
        number: '02',
        icon: 'ti ti-robot',
        title: 'AIが下書き作成',
        description: 'AIが入力内容を解析し、SOAP形式などの記録下書きを自動生成します。'
      },
      {
        number: '03',
        icon: 'ti ti-circle-check',
        title: '確認して保存',
        description: '下書きを確認・修正して保存。抜け漏れチェックも自動で実施されます。'
      }
    ],
    demoImage: '/assets/images/landing/img-header-main.jpg'
  },

  // ===== SECURITY SECTION =====
  security: {
    title: '医療現場に求められるセキュリティと管理機能',
    subtitle: '個人情報保護と監査対応を重視した設計',
    features: [
      {
        icon: 'ti ti-lock-square',
        title: 'データ暗号化',
        description: '保存時および通信時の暗号化により、患者情報を安全に保護します。'
      },
      {
        icon: 'ti ti-user-shield',
        title: 'アクセス制御（RBAC）',
        description: '役割ベースのアクセス制御で、権限のない閲覧・編集を防ぎます。'
      },
      {
        icon: 'ti ti-file-text',
        title: '操作ログ',
        description: '誰がいつ何を操作したか、すべての記録を保持し、監査に対応します。'
      },
      {
        icon: 'ti ti-calendar-time',
        title: 'データ保持ポリシー',
        description: '法令や施設の運用に合わせた保存期間を柔軟に設定できます。'
      }
    ],
    note: '※ 運用に合わせてセキュリティ要件を調整可能です。詳しくはお問い合わせください。'
  },

  // ===== PRICING SECTION =====
  pricing: {
    title: 'シンプルでわかりやすい料金プラン',
    subtitle: '規模や用途に合わせて選べる3つのプラン',
    plans: [
      {
        name: 'スターター',
        price: '¥9,800',
        unit: '/月',
        description: '小規模事業所向けの基本プラン',
        features: ['ユーザー数: 最大5名', 'AI記録要約', 'SOAPテンプレート', '基本的な抜け漏れチェック', 'メールサポート'],
        cta: { label: 'お問い合わせ', href: 'mailto:info@nursenote-ai.jp?subject=スターター問い合わせ' },
        highlighted: false
      },
      {
        name: 'チーム',
        price: '¥29,800',
        unit: '/月',
        description: '中規模チーム向けの標準プラン',
        features: ['ユーザー数: 最大20名', 'スターターの全機能', '音声入力機能', 'チェックリスト機能', '監査ログ', '優先サポート'],
        cta: { label: 'お問い合わせ', href: 'mailto:info@nursenote-ai.jp?subject=チーム問い合わせ' },
        highlighted: true
      },
      {
        name: 'エンタープライズ',
        price: 'お問い合わせ',
        unit: '',
        description: '大規模組織向けのカスタムプラン',
        features: [
          'ユーザー数: 無制限',
          'チームの全機能',
          'データ連携（CSV/API）',
          'カスタムテンプレート作成',
          'オンボーディング支援',
          '専任サポート'
        ],
        cta: { label: 'お問い合わせ', href: 'mailto:info@nursenote-ai.jp?subject=エンタープライズ問い合わせ' },
        highlighted: false
      }
    ]
  },

  // ===== FAQ SECTION =====
  faq: {
    title: 'よくある質問',
    items: [
      {
        question: '既存の運用に合わせてカスタマイズできますか？',
        answer:
          'はい、可能です。記録フォーマット、チェック項目、テンプレートなど、施設の運用に合わせて柔軟にカスタマイズできます。詳細はお問い合わせください。'
      },
      {
        question: '患者の個人情報は安全に保護されますか？',
        answer:
          'データは保存時・通信時ともに暗号化され、役割ベースのアクセス制御により権限のない閲覧を防ぎます。すべての操作はログとして記録され、監査にも対応しています。'
      },
      {
        question: 'どのような記録形式に対応していますか？',
        answer:
          'SOAP形式、問題志向記録（POS）、フォーカスチャーティングなど、主要な記録形式に対応しています。施設独自のフォーマットもカスタマイズ可能です。'
      },
      {
        question: '入力した記録データはAIの学習に使われますか？',
        answer:
          'お客様のデータをAI学習に使用するかどうかは、契約時に選択いただけます。学習利用なしの設定も可能で、データの取り扱いは契約内容に従います。'
      },
      {
        question: '導入までどのくらいの期間がかかりますか？',
        answer:
          '最短で2週間程度で導入可能です。初期設定、スタッフトレーニング、カスタマイズの内容により期間は変動します。詳しくはお問い合わせください。'
      },
      {
        question: 'サポート体制はどうなっていますか？',
        answer:
          'プランに応じてメールサポート、優先サポート、専任サポートをご提供します。操作方法の質問から、運用改善のご相談まで幅広く対応いたします。'
      }
    ]
  },

  // ===== TESTIMONIALS SECTION =====
  testimonials: [
    {
      quote: '記録時間が半分以下になり、患者さんとの時間を増やせました。スタッフの残業も大幅に減りました。',
      author: 'A訪問看護ステーション',
      role: '看護師長',
      avatar: '/assets/images/user/avatar-1.png'
    },
    {
      quote: 'SOAP形式への変換が自動化され、記録の質が均一になりました。新人教育の負担も軽減されています。',
      author: 'B精神科訪問看護',
      role: '管理者',
      avatar: '/assets/images/user/avatar-2.png'
    },
    {
      quote: '音声入力で訪問直後に記録できるので、記憶が鮮明なうちに記録を残せるようになりました。',
      author: 'C訪問看護ステーション',
      role: '訪問看護師',
      avatar: '/assets/images/user/avatar-3.png'
    }
  ],

  // ===== FOOTER =====
  footer: {
    productName: 'Nurse Note AI',
    tagline: '医療現場の記録を、速く正確に。',
    links: [
      { label: '利用規約', href: '#' },
      { label: 'プライバシーポリシー', href: '#' },
      { label: 'お問い合わせ', href: 'mailto:info@nursenote-ai.jp' }
    ],
    copyright: '© 2025 Nurse Note AI. All rights reserved.'
  }
};
