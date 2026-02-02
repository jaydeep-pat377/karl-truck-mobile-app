import Foundation
import WidgetKit

@objc(WidgetModule)
class WidgetModule: NSObject {

    static let appGroupId = "group.com.truckast.widget"
    static let dataKey = "todayOverviewData"

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc
    func updateWidgetData(_ data: NSDictionary) {
        guard let userDefaults = UserDefaults(suiteName: WidgetModule.appGroupId) else {
            print("WidgetModule: Failed to access App Group UserDefaults")
            return
        }

        let widgetData: [String: Any] = [
            "totalOrders": data["totalOrders"] as? Int ?? 0,
            "normal": data["normal"] as? Int ?? 0,
            "willCall": data["willCall"] as? Int ?? 0,
            "hold": data["hold"] as? Int ?? 0,
            "cancelled": data["cancelled"] as? Int ?? 0,
            "inProgress": data["inProgress"] as? Int ?? 0,
            "completed": data["completed"] as? Int ?? 0,
            "isLoggedIn": data["isLoggedIn"] as? Bool ?? false,
            "lastUpdated": ISO8601DateFormatter().string(from: Date())
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: widgetData, options: [])
            userDefaults.set(jsonData, forKey: WidgetModule.dataKey)
            userDefaults.synchronize()

            // Trigger widget refresh
            WidgetCenter.shared.reloadTimelines(ofKind: "TodayOverviewWidget")
            print("WidgetModule: Widget data updated successfully")
        } catch {
            print("WidgetModule: Failed to encode widget data: \(error)")
        }
    }

    @objc
    func setLoggedIn(_ isLoggedIn: Bool) {
        guard let userDefaults = UserDefaults(suiteName: WidgetModule.appGroupId) else {
            print("WidgetModule: Failed to access App Group UserDefaults")
            return
        }

        // Get existing data or create empty
        var widgetData: [String: Any] = [
            "totalOrders": 0,
            "normal": 0,
            "willCall": 0,
            "hold": 0,
            "cancelled": 0,
            "inProgress": 0,
            "completed": 0,
            "isLoggedIn": isLoggedIn,
            "lastUpdated": ISO8601DateFormatter().string(from: Date())
        ]

        // If logging in, try to preserve existing order data
        if isLoggedIn {
            if let existingData = userDefaults.data(forKey: WidgetModule.dataKey),
               let existingDict = try? JSONSerialization.jsonObject(with: existingData) as? [String: Any] {
                widgetData["totalOrders"] = existingDict["totalOrders"] ?? 0
                widgetData["normal"] = existingDict["normal"] ?? 0
                widgetData["willCall"] = existingDict["willCall"] ?? 0
                widgetData["hold"] = existingDict["hold"] ?? 0
                widgetData["cancelled"] = existingDict["cancelled"] ?? 0
                widgetData["inProgress"] = existingDict["inProgress"] ?? 0
                widgetData["completed"] = existingDict["completed"] ?? 0
            }
        }

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: widgetData, options: [])
            userDefaults.set(jsonData, forKey: WidgetModule.dataKey)
            userDefaults.synchronize()
            WidgetCenter.shared.reloadTimelines(ofKind: "TodayOverviewWidget")
            print("WidgetModule: Login state updated to \(isLoggedIn)")
        } catch {
            print("WidgetModule: Failed to update login state: \(error)")
        }
    }

    @objc
    func reloadWidget() {
        WidgetCenter.shared.reloadTimelines(ofKind: "TodayOverviewWidget")
    }
}
