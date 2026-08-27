import Ionicons from "@expo/vector-icons/Ionicons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheet, Button, Input, Text, TextField, useThemeColor } from "heroui-native";
import { useEffect, useRef, type ComponentRef } from "react";
import { View } from "react-native";

import {
  useAssistSession,
  type AssistBubble,
} from "@/store/use-assist-session";
import { useT } from "@/store/locale-store";

interface AssistSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function bubbleClasses(kind: AssistBubble["kind"]): {
  row: string;
  bubble: string;
  text: string;
} {
  if (kind === "user") {
    return {
      row: "items-end",
      bubble: "bg-accent rounded-br-md",
      text: "text-accent-foreground",
    };
  }
  if (kind === "error") {
    return {
      row: "items-start",
      bubble: "bg-danger/10 border border-danger/40 rounded-bl-md",
      text: "text-danger",
    };
  }
  return {
    row: "items-start",
    bubble: "bg-surface-secondary rounded-bl-md",
    text: "text-foreground",
  };
}

/**
 * Kept in a child of the sheet so the pipeline subscription and the microphone
 * only exist while Assist is on screen.
 */
function AssistConversation({ onClose }: { onClose: () => void }) {
  const t = useT();
  const muted = useThemeColor("muted");
  const accentForeground = useThemeColor("accent-foreground");
  const foreground = useThemeColor("foreground");
  const scrollRef = useRef<ComponentRef<typeof BottomSheetScrollView>>(null);

  const {
    messages,
    draft,
    setDraft,
    phase,
    wakeAvailable,
    wakeEnabled,
    sendText,
    toggleMic,
    toggleWake,
  } = useAssistSession();

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, phase]);

  const listening = phase === "listening";
  const waking = phase === "wake";
  const thinking = phase === "thinking";
  const empty = messages.length === 0 && !listening && !thinking;

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 pb-2">
        <BottomSheet.Title className="flex-1">
          {t("assist.title")}
        </BottomSheet.Title>
        {wakeAvailable ? (
          <Button
            variant={wakeEnabled ? "primary" : "ghost"}
            size="sm"
            isIconOnly
            accessibilityLabel={
              wakeEnabled ? t("assist.wakeOn") : t("assist.wakeOff")
            }
            onPress={toggleWake}
          >
            <Ionicons
              name="ear"
              size={18}
              color={wakeEnabled ? accentForeground : foreground}
            />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          accessibilityLabel={t("assist.close")}
          onPress={onClose}
        >
          <Ionicons name="close" size={18} color={foreground} />
        </Button>
      </View>

      <BottomSheetScrollView
        ref={scrollRef}
        contentContainerClassName="gap-2 py-2"
        showsVerticalScrollIndicator={false}
      >
        {empty ? (
          <Text className="text-muted px-2 py-8 text-center text-sm">
            {t(waking || wakeEnabled ? "assist.emptyWake" : "assist.empty")}
          </Text>
        ) : (
          <>
            {messages.map((bubble) => {
              const styles = bubbleClasses(bubble.kind);
              return (
                <View key={bubble.id} className={styles.row}>
                  <View
                    className={`max-w-[85%] rounded-2xl px-3 py-2 ${styles.bubble}`}
                  >
                    <Text className={`text-sm ${styles.text}`}>
                      {bubble.text}
                    </Text>
                  </View>
                </View>
              );
            })}
            {waking || listening || thinking ? (
              <Text className="text-muted px-1 text-xs">
                {waking
                  ? t("assist.wake")
                  : listening
                    ? t("assist.listening")
                    : t("assist.thinking")}
              </Text>
            ) : null}
          </>
        )}
      </BottomSheetScrollView>

      <View className="flex-row items-center gap-2 pb-4 pt-2">
        <Button
          variant={listening ? "primary" : "secondary"}
          size="md"
          isIconOnly
          accessibilityLabel={
            listening ? t("assist.micStop") : t("assist.micStart")
          }
          onPress={() => void toggleMic()}
        >
          <Ionicons
            name={listening ? "stop" : "mic"}
            size={20}
            color={listening ? accentForeground : foreground}
          />
        </Button>
        <TextField className="flex-1">
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder={t("assist.placeholder")}
            placeholderTextColor={muted}
            returnKeyType="send"
            onSubmitEditing={() => void sendText()}
            autoCapitalize="sentences"
          />
        </TextField>
        <Button
          variant="primary"
          size="md"
          isIconOnly
          isDisabled={!draft.trim()}
          accessibilityLabel={t("assist.send")}
          onPress={() => void sendText()}
        >
          <Ionicons name="arrow-up" size={20} color={accentForeground} />
        </Button>
      </View>
    </View>
  );
}

export function AssistSheet({ isOpen, onOpenChange }: AssistSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={["70%", "92%"]}
          enableOverDrag={false}
          enableDynamicSizing={false}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          contentContainerClassName="h-full"
        >
          {isOpen ? (
            <AssistConversation onClose={() => onOpenChange(false)} />
          ) : null}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
