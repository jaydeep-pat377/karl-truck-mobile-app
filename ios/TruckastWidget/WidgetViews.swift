import SwiftUI
import WidgetKit

// MARK: - Main Widget View
struct TodayOverviewWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: TodayOverviewEntry

    var body: some View {
        if entry.data.isLoggedIn {
            switch family {
            case .systemSmall:
                SmallWidgetView(data: entry.data)
            case .systemMedium:
                MediumWidgetView(data: entry.data)
            case .systemLarge:
                LargeWidgetView(data: entry.data)
            @unknown default:
                SmallWidgetView(data: entry.data)
            }
        } else {
            LoggedOutView()
        }
    }
}

// MARK: - Small Widget View
struct SmallWidgetView: View {
    let data: WidgetData

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(LinearGradient(
                    gradient: Gradient(colors: [Color(hex: "1A1A2E"), Color(hex: "16213E")]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))

            VStack(alignment: .leading, spacing: 8) {
                // Header
                HStack {
                    Image(systemName: "truck.box.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Color(hex: "4DA6FF"))
                    Text("Today")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                    Spacer()
                }

                Spacer()

                // Progress Circle
                HStack {
                    Spacer()
                    ZStack {
                        Circle()
                            .stroke(Color.white.opacity(0.2), lineWidth: 6)
                            .frame(width: 60, height: 60)

                        Circle()
                            .trim(from: 0, to: CGFloat(data.progress) / 100)
                            .stroke(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color(hex: "4DA6FF"), Color(hex: "00D9A5")]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                ),
                                style: StrokeStyle(lineWidth: 6, lineCap: .round)
                            )
                            .frame(width: 60, height: 60)
                            .rotationEffect(.degrees(-90))

                        Text("\(data.progress)%")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    }
                    Spacer()
                }

                Spacer()

                // Stats
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(data.completed)")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(Color(hex: "00D9A5"))
                        Text("Done")
                            .font(.system(size: 10))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(data.inProgress)")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(Color(hex: "4DA6FF"))
                        Text("Active")
                            .font(.system(size: 10))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
            }
            .padding(12)
        }
    }
}

// MARK: - Medium Widget View
struct MediumWidgetView: View {
    let data: WidgetData

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(LinearGradient(
                    gradient: Gradient(colors: [Color(hex: "1A1A2E"), Color(hex: "16213E")]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))

            VStack(spacing: 12) {
                // Header
                HStack {
                    Image(systemName: "truck.box.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Color(hex: "4DA6FF"))
                    Text("Today's Overview")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                    Spacer()
                    Text("\(data.progress)%")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(Color(hex: "00D9A5"))
                }

                // Progress Bar
                ProgressBarView(data: data)

                // Stats Row
                HStack(spacing: 16) {
                    StatItem(value: data.completed, label: "Completed", color: Color(hex: "00D9A5"))
                    StatItem(value: data.inProgress, label: "In Progress", color: Color(hex: "4DA6FF"))
                    StatItem(value: data.normal, label: "Pending", color: Color(hex: "8B8B8B"))
                    StatItem(value: data.hold + data.willCall, label: "On Hold", color: Color(hex: "FFB800"))
                }
            }
            .padding(16)
        }
    }
}

// MARK: - Large Widget View
struct LargeWidgetView: View {
    let data: WidgetData

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(LinearGradient(
                    gradient: Gradient(colors: [Color(hex: "1A1A2E"), Color(hex: "16213E")]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))

            VStack(spacing: 16) {
                // Header
                HStack {
                    Image(systemName: "truck.box.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(Color(hex: "4DA6FF"))
                    Text("Today's Overview")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                    Spacer()
                    Text("\(data.totalOrders) Orders")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.6))
                }

                // Progress Section
                HStack(spacing: 20) {
                    // Progress Circle
                    ZStack {
                        Circle()
                            .stroke(Color.white.opacity(0.2), lineWidth: 10)
                            .frame(width: 100, height: 100)

                        Circle()
                            .trim(from: 0, to: CGFloat(data.progress) / 100)
                            .stroke(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color(hex: "4DA6FF"), Color(hex: "00D9A5")]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                ),
                                style: StrokeStyle(lineWidth: 10, lineCap: .round)
                            )
                            .frame(width: 100, height: 100)
                            .rotationEffect(.degrees(-90))

                        VStack(spacing: 2) {
                            Text("\(data.progress)%")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.white)
                            Text("Complete")
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }

                    // Stats Column
                    VStack(alignment: .leading, spacing: 12) {
                        LargeStatItem(value: data.completed, label: "Completed", color: Color(hex: "00D9A5"))
                        LargeStatItem(value: data.inProgress, label: "In Progress", color: Color(hex: "4DA6FF"))
                        LargeStatItem(value: data.normal, label: "Pending", color: Color(hex: "8B8B8B"))
                    }

                    Spacer()
                }

                // Progress Bar
                ProgressBarView(data: data)

                // Detailed Stats Grid
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    DetailStatItem(value: data.willCall, label: "Will Call", color: Color(hex: "FF9500"))
                    DetailStatItem(value: data.hold, label: "On Hold", color: Color(hex: "FFB800"))
                    DetailStatItem(value: data.cancelled, label: "Cancelled", color: Color(hex: "FF3B30"))
                }

                Spacer()
            }
            .padding(16)
        }
    }
}

// MARK: - Logged Out View
struct LoggedOutView: View {
    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(LinearGradient(
                    gradient: Gradient(colors: [Color(hex: "1A1A2E"), Color(hex: "16213E")]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))

            VStack(spacing: 12) {
                Image(systemName: "person.crop.circle.badge.exclamationmark")
                    .font(.system(size: 40))
                    .foregroundColor(Color(hex: "4DA6FF"))

                Text("Sign In Required")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)

                Text("Open the app to sign in")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
            }
            .padding()
        }
    }
}

// MARK: - Progress Bar View
struct ProgressBarView: View {
    let data: WidgetData

    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 2) {
                if data.totalOrders > 0 {
                    SegmentView(width: segmentWidth(geometry.size.width, count: data.willCall), color: Color(hex: "FF9500"))
                    SegmentView(width: segmentWidth(geometry.size.width, count: data.hold), color: Color(hex: "FFB800"))
                    SegmentView(width: segmentWidth(geometry.size.width, count: data.cancelled), color: Color(hex: "FF3B30"))
                    SegmentView(width: segmentWidth(geometry.size.width, count: data.normal), color: Color(hex: "8B8B8B"))
                    SegmentView(width: segmentWidth(geometry.size.width, count: data.inProgress), color: Color(hex: "4DA6FF"))
                    SegmentView(width: segmentWidth(geometry.size.width, count: data.completed), color: Color(hex: "00D9A5"))
                } else {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.2))
                }
            }
        }
        .frame(height: 8)
    }

    private func segmentWidth(_ totalWidth: CGFloat, count: Int) -> CGFloat {
        guard data.totalOrders > 0, count > 0 else { return 0 }
        return max(4, totalWidth * CGFloat(count) / CGFloat(data.totalOrders))
    }
}

struct SegmentView: View {
    let width: CGFloat
    let color: Color

    var body: some View {
        if width > 0 {
            RoundedRectangle(cornerRadius: 4)
                .fill(color)
                .frame(width: width)
        }
    }
}

// MARK: - Stat Items
struct StatItem: View {
    let value: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 10))
                .foregroundColor(.white.opacity(0.6))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }
}

struct LargeStatItem: View {
    let value: Int
    let label: String
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text("\(value)")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.6))
        }
    }
}

struct DetailStatItem: View {
    let value: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 10))
                .foregroundColor(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.05))
        .cornerRadius(8)
    }
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
