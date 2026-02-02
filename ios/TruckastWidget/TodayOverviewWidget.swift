import WidgetKit
import SwiftUI

// MARK: - Widget Data Model
struct WidgetData: Codable {
    let totalOrders: Int
    let normal: Int
    let willCall: Int
    let hold: Int
    let cancelled: Int
    let inProgress: Int
    let completed: Int
    let isLoggedIn: Bool
    let lastUpdated: Date

    var progress: Int {
        guard totalOrders > 0 else { return 0 }
        return (completed * 100) / totalOrders
    }

    static let placeholder = WidgetData(
        totalOrders: 12,
        normal: 3,
        willCall: 2,
        hold: 1,
        cancelled: 1,
        inProgress: 3,
        completed: 2,
        isLoggedIn: true,
        lastUpdated: Date()
    )

    static let loggedOut = WidgetData(
        totalOrders: 0,
        normal: 0,
        willCall: 0,
        hold: 0,
        cancelled: 0,
        inProgress: 0,
        completed: 0,
        isLoggedIn: false,
        lastUpdated: Date()
    )
}

// MARK: - Timeline Entry
struct TodayOverviewEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

// MARK: - Timeline Provider
struct TodayOverviewProvider: TimelineProvider {
    // App Group identifier for sharing data between app and widget
    static let appGroupId = "group.com.truckast.widget"
    static let dataKey = "todayOverviewData"

    func placeholder(in context: Context) -> TodayOverviewEntry {
        TodayOverviewEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayOverviewEntry) -> Void) {
        let data = loadWidgetData()
        let entry = TodayOverviewEntry(date: Date(), data: data)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayOverviewEntry>) -> Void) {
        let data = loadWidgetData()
        let currentDate = Date()
        let entry = TodayOverviewEntry(date: currentDate, data: data)

        // Refresh every 15 minutes
        let refreshDate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(refreshDate))

        completion(timeline)
    }

    private func loadWidgetData() -> WidgetData {
        guard let userDefaults = UserDefaults(suiteName: Self.appGroupId),
              let jsonData = userDefaults.data(forKey: Self.dataKey) else {
            return .loggedOut
        }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(WidgetData.self, from: jsonData)
        } catch {
            print("Error decoding widget data: \(error)")
            return .loggedOut
        }
    }
}

// MARK: - Widget Configuration
struct TodayOverviewWidget: Widget {
    let kind: String = "TodayOverviewWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayOverviewProvider()) { entry in
            TodayOverviewWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's Overview")
        .description("View your daily order statistics at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Preview
struct TodayOverviewWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            TodayOverviewWidgetView(entry: TodayOverviewEntry(date: Date(), data: .placeholder))
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("Small")

            TodayOverviewWidgetView(entry: TodayOverviewEntry(date: Date(), data: .placeholder))
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Medium")

            TodayOverviewWidgetView(entry: TodayOverviewEntry(date: Date(), data: .placeholder))
                .previewContext(WidgetPreviewContext(family: .systemLarge))
                .previewDisplayName("Large")

            TodayOverviewWidgetView(entry: TodayOverviewEntry(date: Date(), data: .loggedOut))
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Logged Out")
        }
    }
}
