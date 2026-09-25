import { ProgressRing } from '@/components';
import { ProgressBar } from '@/components/ui';
import { FontRole, FontWeight } from '@/constants';
import type { CurriculumProgressRow, ProgressSummary } from '@/models';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useFont } from '@/services';
import { MaterialIcons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from 'styled-components/native';

// Corporate "My progress" (design handoff, "My progress (corporate)"):
// greeting, overall card (ring + lessons/levels stats) and the per-curriculum
// list. Certificates are deliberately not rendered until certificates exist.
// Presentational only: StudentProfileScreen wires it to useProgressSummary,
// and the dev gallery feeds it fixtures.

export type MyProgressVariant = 'phone' | 'tablet' | 'desktop';

// Same thresholds as useNavShell's corporate shells: sidebar (desktop) at
// SIDEBAR_MIN_WIDTH, rail (tablet) at DEFAULT_MIN_WIDTH, tabs (phone) below.
export function myProgressVariantFor(
  width: number,
  breakpoints: { DEFAULT_MIN_WIDTH: number; SIDEBAR_MIN_WIDTH: number },
): MyProgressVariant {
  if (width >= breakpoints.SIDEBAR_MIN_WIDTH) return 'desktop';
  if (width >= breakpoints.DEFAULT_MIN_WIDTH) return 'tablet';
  return 'phone';
}

export interface MyProgressSectionProps {
  summary?: ProgressSummary;
  loading: boolean;
  error: boolean;
  isStale: boolean;
  onRetry: () => void;
  studentName: string;
  variant: MyProgressVariant;
}

// Code-point safe (not charAt) so a surrogate-pair character in a name
// doesn't get split into a mangled half-character initial.
export function getInitials(firstName?: string, lastName?: string): string {
  const firstInitial = firstName ? Array.from(firstName)[0] ?? '' : '';
  const lastInitial = lastName ? Array.from(lastName)[0] ?? '' : '';
  return `${firstInitial}${lastInitial}`;
}

function initialsFromFullName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return getInitials(parts[0], parts.length > 1 ? parts[parts.length - 1] : '');
}

export function formatFetchedAt(fetchedAt: number, language: string): string {
  const date = new Date(fetchedAt);
  try {
    const locale = language === 'km' ? 'km-KH' : 'en-GB';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(
      date.getMonth() + 1,
    )}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}

const SIZES = {
  phone: {
    avatar: 52,
    avatarText: 20,
    ring: 116,
    ringStroke: 10,
    ringValue: 30,
    rowGap: 8,
    visibleRows: 2,
    cardPadding: 16,
  },
  tablet: {
    avatar: 56,
    avatarText: 22,
    ring: 156,
    ringStroke: 12,
    ringValue: 38,
    rowGap: 12,
    visibleRows: 3,
    cardPadding: 20,
  },
  // Desktop (handoff "My progress (corporate)" -> Desktop 1440x900): 64pt
  // avatar, 184pt/14 ring, full-width overall card, "By curriculum" as a
  // 2-column grid (2x2 visible before "View all").
  desktop: {
    avatar: 64,
    avatarText: 26,
    ring: 184,
    ringStroke: 14,
    ringValue: 46,
    rowGap: 12,
    visibleRows: 4,
    cardPadding: 24,
  },
} as const;

const DESKTOP_TITLE_SIZE = 40;
const DESKTOP_TITLE_LINE_HEIGHT = 48;

// Splits rows into pairs for the desktop 2-column grid.
function pairs<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2));
  return out;
}

/**
 * Text style factory for this section. Latin gets the handoff's sizes;
 * Khmer (Noto Sans Khmer for every role) gets a 13px floor, a 1.6x line
 * height and never any letter-spacing. No text box here has a fixed height.
 */
function useMpText() {
  const theme = useTheme();
  const isKhmer = useAppSelector(getSelectedLanguage) === 'km';
  const fonts: Record<`${FontRole}-${FontWeight}`, string> = {
    'display-bold': useFont('bold', 'display'),
    'display-semi': useFont('semi', 'display'),
    'display-normal': useFont('normal', 'display'),
    'body-bold': useFont('bold', 'body'),
    'body-semi': useFont('semi', 'body'),
    'body-normal': useFont('normal', 'body'),
    'mono-bold': useFont('bold', 'mono'),
    'mono-semi': useFont('semi', 'mono'),
    'mono-normal': useFont('normal', 'mono'),
  };

  const text = (
    role: FontRole,
    weight: FontWeight,
    size: number,
    color: string,
    latinLineHeight?: number,
  ): TextStyle => {
    const fontSize = isKhmer ? Math.max(13, size) : size;
    return {
      fontFamily: fonts[`${role}-${weight}`],
      fontSize,
      lineHeight: isKhmer ? Math.round(fontSize * 1.6) : latinLineHeight,
      letterSpacing: 0,
      color,
    };
  };

  return { text, isKhmer, theme };
}

function Card({
  children,
  padding,
  style,
}: {
  children: ReactNode;
  padding: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.card,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          padding,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

function SkeletonBlock({
  width,
  height,
  tone = 'dark',
}: {
  width: number | `${number}%`;
  height: number;
  tone?: 'dark' | 'light';
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 6,
        backgroundColor:
          tone === 'dark' ? theme.colors.divider : theme.colors.surfaceVariant,
      }}
    />
  );
}

function StatBlock({
  label,
  done,
  total,
  percent,
  large = false,
}: {
  label: string;
  done: number;
  total: number;
  percent: number;
  /** Desktop: 16 label, Space Grotesk 700 34 count. */
  large?: boolean;
}) {
  const { t } = useTranslation();
  const { text, theme } = useMpText();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}>
        <Text
          style={[
            text(
              'body',
              'semi',
              large ? 16 : 15,
              theme.colors.onBackground,
              22,
            ),
            { flexShrink: 1 },
          ]}>
          {label}
        </Text>
        <Text
          style={text('body', 'semi', 14, theme.colors.onSurfaceVariant, 20)}>
          {`${percent}%`}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          marginTop: 4,
        }}>
        <Text
          style={text(
            'display',
            'bold',
            large ? 34 : 22,
            theme.colors.onBackground,
            large ? 40 : 28,
          )}>
          {String(done)}
        </Text>
        <Text
          style={[
            text(
              'body',
              'normal',
              large ? 16 : 14,
              theme.colors.onSurfaceVariant,
              20,
            ),
            { marginLeft: 5 },
          ]}>
          {t('screen.myProgress.ofTotal', { total })}
        </Text>
      </View>
      <View style={{ marginTop: large ? 12 : 8 }}>
        <ProgressBar progress={percent / 100} height={6} />
      </View>
    </View>
  );
}

function CurriculumRow({
  row,
  style,
}: {
  row: CurriculumProgressRow;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { text, theme } = useMpText();
  const level = row.currentLevel;
  const percent = level ? level.percent : row.percent;
  const allDone =
    !level && row.lessonsTotal > 0 && row.lessonsCompleted >= row.lessonsTotal;

  let meta: ReactNode = null;
  if (level) {
    meta = (
      <Text
        style={[
          text('body', 'normal', 14, theme.colors.onSurfaceVariant, 18),
          { marginTop: 2 },
        ]}>
        {`${level.gradeName} · ${level.levelName} · ${t(
          'screen.myProgress.lessonsOfTotal',
          { done: level.lessonsCompleted, total: level.lessonsTotal },
        )}`}
      </Text>
    );
  } else if (allDone) {
    meta = (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginTop: 2,
        }}>
        <MaterialIcons
          name="check-circle"
          size={16}
          color={theme.colors.successText}
        />
        <Text
          style={[
            text('body', 'semi', 14, theme.colors.successText, 18),
            { flexShrink: 1 },
          ]}>
          {t('screen.myProgress.allLevelsComplete')}
        </Text>
      </View>
    );
  }

  return (
    <Card padding={12} style={[{ paddingHorizontal: 15 }, style]}>
      <View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}>
          <Text
            style={[
              text('body', 'semi', 15, theme.colors.onBackground, 20),
              { flex: 1 },
            ]}>
            {row.name}
          </Text>
          <Text
            style={text('display', 'bold', 16, theme.colors.onBackground, 20)}>
            {`${percent}%`}
          </Text>
        </View>
        {meta}
      </View>
      <View style={{ marginTop: 10 }}>
        <ProgressBar progress={percent / 100} height={5} />
      </View>
    </Card>
  );
}

function SkeletonCurriculumRow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Card padding={14} style={[{ paddingHorizontal: 15, gap: 10 }, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SkeletonBlock width="62%" height={16} />
        <SkeletonBlock width={36} height={16} />
      </View>
      <SkeletonBlock width="48%" height={12} tone="light" />
      <SkeletonBlock width="100%" height={5} />
    </Card>
  );
}

export default function MyProgressSection({
  summary,
  loading,
  error,
  isStale,
  onRetry,
  studentName,
  variant,
}: MyProgressSectionProps) {
  const { t, i18n } = useTranslation();
  const { text, theme, isKhmer } = useMpText();
  const [expanded, setExpanded] = useState(false);
  const size = SIZES[variant];
  const isTablet = variant === 'tablet';
  const isDesktop = variant === 'desktop';
  // The theme's type scale has phone/tablet only; desktop reuses tablet for
  // card titles and overrides the screen title (40) itself.
  const scale =
    theme.typeScale[isKhmer ? 'km' : 'en'][isDesktop ? 'tablet' : variant];

  const initials = initialsFromFullName(studentName);

  // Screen/card titles come straight from the locale-aware type scale.
  const titleStyle = (role: 'screenTitle' | 'cardTitle'): TextStyle => {
    if (isDesktop && role === 'screenTitle') {
      return {
        ...text(
          'display',
          'bold',
          DESKTOP_TITLE_SIZE,
          theme.colors.onBackground,
          DESKTOP_TITLE_LINE_HEIGHT,
        ),
        letterSpacing: isKhmer ? 0 : -0.02 * DESKTOP_TITLE_SIZE,
      };
    }
    return {
      ...text(
        'display',
        'bold',
        scale[role].fontSize,
        theme.colors.onBackground,
      ),
      lineHeight: scale[role].lineHeight,
      letterSpacing:
        !isKhmer && role === 'screenTitle' ? -0.02 * scale[role].fontSize : 0,
    };
  };

  // --- Greeting ------------------------------------------------------------
  const greeting = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: size.avatar,
          height: size.avatar,
          borderRadius: theme.radii.pill,
          backgroundColor: theme.colors.primaryLight,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Text
          style={text(
            'display',
            'bold',
            size.avatarText,
            theme.colors.primary,
          )}>
          {initials}
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: isDesktop ? 20 : isTablet ? 16 : 12,
        }}>
        {isTablet || isDesktop ? (
          <>
            <Text
              style={text(
                'body',
                'semi',
                isDesktop ? 16 : 15,
                theme.colors.onSurfaceVariant,
                22,
              )}>
              {studentName
                ? t('screen.myProgress.greetingWithName', { name: studentName })
                : t('screen.myProgress.greeting')}
            </Text>
            <Text accessibilityRole="header" style={titleStyle('screenTitle')}>
              {t('screen.myProgress.title')}
            </Text>
          </>
        ) : (
          <>
            <Text
              style={text(
                'body',
                'semi',
                15,
                theme.colors.onSurfaceVariant,
                20,
              )}>
              {t('screen.myProgress.greeting')}
            </Text>
            {!!studentName && (
              <Text style={titleStyle('screenTitle')}>{studentName}</Text>
            )}
          </>
        )}
      </View>
    </View>
  );

  // --- "By curriculum" header + View all ------------------------------------
  const curricula = summary?.curricula ?? [];
  const hasMore = curricula.length > size.visibleRows;
  const visibleRows =
    expanded || !hasMore ? curricula : curricula.slice(0, size.visibleRows);

  const sectionHeader = (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: isTablet || isDesktop ? 12 : 8,
      }}>
      <Text
        accessibilityRole="header"
        style={[titleStyle('cardTitle'), { flexShrink: 1 }]}>
        {t('screen.myProgress.byCurriculum')}
      </Text>
      {hasMore && (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setExpanded(v => !v)}
          style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={text('body', 'semi', 15, theme.colors.primary, 20)}>
            {expanded
              ? t('screen.myProgress.showLess')
              : t('screen.myProgress.viewAll')}
          </Text>
        </Pressable>
      )}
    </View>
  );

  // --- Loading (no cache): skeleton ------------------------------------------
  const renderSkeleton = () => {
    const statSkeleton = (
      <View style={{ gap: 8 }}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="40%" height={20} tone="light" />
        <SkeletonBlock width="100%" height={6} />
      </View>
    );
    const ringSkeleton = (
      <View
        style={{
          width: size.ring,
          height: size.ring,
          borderRadius: size.ring / 2,
          borderWidth: size.ringStroke,
          borderColor: theme.colors.divider,
        }}
      />
    );
    const overall = (
      <Card
        padding={size.cardPadding}
        style={
          isTablet
            ? { flex: 3, gap: 20 }
            : { flexDirection: 'row', alignItems: 'center', gap: 18 }
        }>
        <View style={{ alignItems: 'center' }}>{ringSkeleton}</View>
        <View style={{ flex: isTablet ? undefined : 1, gap: 20 }}>
          {statSkeleton}
          {statSkeleton}
        </View>
      </Card>
    );
    const rows = (
      <View style={{ gap: size.rowGap }}>
        {Array.from({ length: size.visibleRows }).map((_, i) => (
          <SkeletonCurriculumRow key={i} />
        ))}
      </View>
    );
    if (isDesktop) {
      return (
        <View
          accessible
          accessibilityLabel={t('screen.myProgress.loading')}
          accessibilityState={{ busy: true }}>
          <Card
            padding={size.cardPadding}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 48 }}>
            {ringSkeleton}
            <View style={{ flex: 1, flexDirection: 'row', gap: 40 }}>
              <View style={{ flex: 1 }}>{statSkeleton}</View>
              <View style={{ flex: 1 }}>{statSkeleton}</View>
            </View>
          </Card>
          <Card padding={size.cardPadding} style={{ marginTop: 24, gap: 16 }}>
            <SkeletonBlock width={160} height={22} />
            {[0, 1].map(r => (
              <View key={r} style={{ flexDirection: 'row', gap: size.rowGap }}>
                <SkeletonCurriculumRow style={{ flex: 1 }} />
                <SkeletonCurriculumRow style={{ flex: 1 }} />
              </View>
            ))}
          </Card>
        </View>
      );
    }
    return (
      <View
        accessible
        accessibilityLabel={t('screen.myProgress.loading')}
        accessibilityState={{ busy: true }}>
        {isTablet ? (
          <View style={{ flexDirection: 'row', gap: 20 }}>
            {overall}
            <Card padding={size.cardPadding} style={{ flex: 5, gap: 16 }}>
              <SkeletonBlock width={160} height={22} />
              {rows}
            </Card>
          </View>
        ) : (
          <>
            {overall}
            <View style={{ marginTop: 32, marginBottom: 16 }}>
              <SkeletonBlock width={150} height={22} />
            </View>
            {rows}
          </>
        )}
      </View>
    );
  };

  // --- Error (no cache): field-level message + Retry -------------------------
  const renderError = () => (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: 6,
      }}>
      <MaterialIcons
        name="error-outline"
        size={14}
        color={theme.colors.error}
      />
      <Text
        style={[
          text('body', 'semi', 12, theme.colors.error, 16),
          { flexShrink: 1 },
        ]}>
        {t('screen.myProgress.loadError')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={{
          minHeight: 44,
          minWidth: 44,
          justifyContent: 'center',
          paddingHorizontal: 6,
        }}>
        <Text style={text('body', 'semi', 14, theme.colors.primary, 20)}>
          {t('screen.myProgress.retry')}
        </Text>
      </Pressable>
    </View>
  );

  // --- Data (fresh, stale or nothing started) --------------------------------
  const renderContent = (data: ProgressSummary) => {
    const ring = (
      <ProgressRing
        size={size.ring}
        strokeWidth={size.ringStroke}
        progress={data.overallPercent / 100}
        accessibilityLabel={t('screen.myProgress.overallProgress')}>
        <Text
          style={text(
            'display',
            'bold',
            size.ringValue,
            theme.colors.onBackground,
          )}>
          {`${data.overallPercent}%`}
        </Text>
        <Text
          style={text(
            'body',
            'semi',
            isDesktop ? 16 : 14,
            theme.colors.onSurfaceVariant,
            isDesktop ? 22 : 18,
          )}>
          {t('screen.myProgress.overall')}
        </Text>
      </ProgressRing>
    );

    const stats = (
      <View style={{ gap: isTablet ? 20 : 16 }}>
        <StatBlock
          label={t('screen.myProgress.lessonsCompleted')}
          done={data.lessonsCompleted}
          total={data.lessonsTotal}
          percent={data.overallPercent}
        />
        <StatBlock
          label={t('screen.myProgress.levelsCompleted')}
          done={data.levelsCompleted}
          total={data.levelsTotal}
          percent={data.levelsPercent}
        />
      </View>
    );

    if (isDesktop) {
      return (
        <>
          <Card
            padding={size.cardPadding}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 48 }}>
            {ring}
            <View
              style={{ flex: 1, minWidth: 0, flexDirection: 'row', gap: 40 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <StatBlock
                  large
                  label={t('screen.myProgress.lessonsCompleted')}
                  done={data.lessonsCompleted}
                  total={data.lessonsTotal}
                  percent={data.overallPercent}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <StatBlock
                  large
                  label={t('screen.myProgress.levelsCompleted')}
                  done={data.levelsCompleted}
                  total={data.levelsTotal}
                  percent={data.levelsPercent}
                />
              </View>
            </View>
          </Card>
          <Card padding={size.cardPadding} style={{ marginTop: 24 }}>
            {sectionHeader}
            {curricula.length === 0 ? (
              <Text
                style={text(
                  'body',
                  'normal',
                  14,
                  theme.colors.onSurfaceVariant,
                  22,
                )}>
                {t('screen.myProgress.noCurricula')}
              </Text>
            ) : (
              <View style={{ gap: size.rowGap }}>
                {pairs(visibleRows).map(pair => (
                  <View
                    key={pair.map(r => r.curriculumId).join('-')}
                    style={{ flexDirection: 'row', gap: size.rowGap }}>
                    {/* Each cell is a padding-free flex: 1 wrapper so both columns
                        (and the empty half of an odd last row) get exactly
                        equal widths — flex-basis 0 on a padded card would
                        otherwise give it its padding on top of its share. */}
                    {pair.map(row => (
                      <View
                        key={row.curriculumId}
                        style={{ flex: 1, minWidth: 0 }}>
                        <CurriculumRow
                          row={row}
                          style={{
                            flex: 1,
                            padding: 16,
                            paddingHorizontal: 20,
                            justifyContent: 'space-between',
                          }}
                        />
                      </View>
                    ))}
                    {pair.length === 1 && <View style={{ flex: 1 }} />}
                  </View>
                ))}
              </View>
            )}
          </Card>
        </>
      );
    }

    const overallCard = isTablet ? (
      <Card padding={size.cardPadding} style={{ flex: 3, gap: 20 }}>
        <View style={{ alignItems: 'center' }}>{ring}</View>
        {stats}
      </Card>
    ) : (
      <Card
        padding={size.cardPadding}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        {ring}
        <View style={{ flex: 1, minWidth: 0 }}>{stats}</View>
      </Card>
    );

    const rows =
      curricula.length === 0 ? (
        <Text
          style={text('body', 'normal', 14, theme.colors.onSurfaceVariant, 22)}>
          {t('screen.myProgress.noCurricula')}
        </Text>
      ) : (
        <View style={{ gap: size.rowGap }}>
          {visibleRows.map(row => (
            <CurriculumRow key={row.curriculumId} row={row} />
          ))}
        </View>
      );

    if (isTablet) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 20 }}>
          {overallCard}
          <Card padding={size.cardPadding} style={{ flex: 5 }}>
            {sectionHeader}
            {rows}
          </Card>
        </View>
      );
    }

    return (
      <>
        {overallCard}
        <View style={{ marginTop: 16 }}>
          {sectionHeader}
          {rows}
        </View>
      </>
    );
  };

  let body: ReactNode = null;
  if (summary) body = renderContent(summary);
  else if (loading) body = renderSkeleton();
  else if (error) body = renderError();

  return (
    <View>
      {greeting}
      {!!summary && isStale && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 12,
          }}>
          <MaterialIcons
            name="history"
            size={14}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            style={[
              text('body', 'normal', 12, theme.colors.onSurfaceVariant, 16),
              { flexShrink: 1 },
            ]}>
            {t('screen.myProgress.staleNote', {
              date: formatFetchedAt(summary.fetchedAt, i18n.language),
            })}
          </Text>
        </View>
      )}
      {body != null && (
        <View style={{ marginTop: isDesktop || isTablet ? 24 : 16 }}>
          {body}
        </View>
      )}
    </View>
  );
}
