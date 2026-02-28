const zhToEn: Record<string, string> = {
  狼队: 'Wolves',
  阿斯顿维拉: 'Aston Villa',
  伯恩茅斯: 'Bournemouth',
  桑德兰: 'Sunderland',
  伯恩利: 'Burnley',
  布伦特福德: 'Brentford',
  利物浦: 'Liverpool',
  西汉姆联: 'West Ham United',
  纽卡斯尔联: 'Newcastle United',
  埃弗顿: 'Everton',
  利兹联: 'Leeds United',
  曼城: 'Manchester City',
  布莱顿: 'Brighton',
  诺丁汉森林: 'Nottingham Forest',
  富勒姆: 'Fulham',
  热刺: 'Tottenham',
  曼联: 'Manchester United',
  水晶宫: 'Crystal Palace',
  阿森纳: 'Arsenal',
  切尔西: 'Chelsea',
  巴西: 'Brazil',
  阿根廷: 'Argentina',
}

const enToZh: Record<string, string> = Object.fromEntries(
  Object.entries(zhToEn).map(([zh, en]) => [en, zh]),
)

function isEnglishLanguage(language?: string) {
  return (language ?? '').toLowerCase().startsWith('en')
}

export function localizeTeamName(name: string, language?: string) {
  if (!name) return name
  if (isEnglishLanguage(language)) {
    return zhToEn[name] ?? name
  }
  return enToZh[name] ?? name
}

export function localizeMatchTitle(title: string, language?: string) {
  const [homeTeam, awayTeam] = title.split(' vs ')
  if (!awayTeam) {
    return localizeTeamName(title, language)
  }
  return `${localizeTeamName(homeTeam, language)} vs ${localizeTeamName(awayTeam, language)}`
}
