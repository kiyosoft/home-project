import { Text } from "heroui-native";
import { ScrollView, View } from "react-native";

import { Screen } from "@/ui/Screen";
import { MediaDetailBody } from "@/widgets/detail/MediaDetailBody";
import { MediaTile } from "@/widgets/tiles/MediaTile";

const CONFIG = { entity_id: "media_player.homepod" };

export default function Probe() {
  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-6 pb-16">
        <Text className="text-muted text-sm uppercase">md</Text>
        <View className="flex-row">
          <MediaTile config={CONFIG} size="md" />
        </View>

        <Text className="text-muted text-sm uppercase">sm</Text>
        <View className="flex-row" style={{ width: "48%" }}>
          <MediaTile config={CONFIG} size="sm" />
        </View>

        <Text className="text-muted text-sm uppercase">detail</Text>
        <MediaDetailBody entityId={CONFIG.entity_id} />
      </ScrollView>
    </Screen>
  );
}
