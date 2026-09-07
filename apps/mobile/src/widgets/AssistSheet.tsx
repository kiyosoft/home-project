import Ionicons from "@expo/vector-icons/Ionicons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  BottomSheet,
  Chip,
  InputGroup,
  Spinner,
  Text,
  useBottomSheetAwareHandlers,
} from "heroui-native";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  Keyboard,
  Platform,
  View,
  type TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import {
  useAssistSession,
  type AssistBubble,
  type AssistPhase,
} from "@/store/use-assist-session";
import { useT } from "@/store/locale-store";
import { Button } from "@/ui/haptic";
import { SETTLE_MS } from "@/ui/motion";

const Icon = withUniwind(Ionicons);

const SNAP_POINTS = ["90%"];

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

function phaseLabel(
  phase: AssistPhase,
  t: ReturnType<typeof useT>,
): string | null {
  if (phase === "wake") return t("assist.wake");
  if (phase === "listening") return t("assist.listening");
  if (phase === "thinking") return t("assist.thinking");
  return null;
}

/** Matches the sheet content's bottom padding so we do not double it. */
const SHEET_PAD = 8;

function AssistComposer({
  draft,
  setDraft,
  listening,
  sendText,
  toggleMic,
}: {
  draft: string;
  setDraft: (next: string) => void;
  listening: boolean;
  sendText: () => void | Promise<void>;
  toggleMic: () => void | Promise<void>;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const canSend = draft.trim().length > 0;

  useEffect(() => {
    const id = setTimeout(() => {
      inputRef.current?.focus();
    }, SETTLE_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <View
      className="pt-2"
      style={{
        paddingBottom: keyboardOpen
          ? 4
          : Math.max(insets.bottom - SHEET_PAD, 4),
      }}
    >
      <InputGroup>
        <InputGroup.Prefix className="px-1">
          <Button
            variant={listening ? "primary" : "ghost"}
            size="sm"
            isIconOnly
            accessibilityLabel={
              listening ? t("assist.micStop") : t("assist.micStart")
            }
            accessibilityState={{ selected: listening }}
            onPress={() => void toggleMic()}
          >
            <Icon
              name={listening ? "stop" : "mic"}
              size={18}
              className={
                listening ? "text-accent-foreground" : "text-foreground"
              }
            />
          </Button>
        </InputGroup.Prefix>
        <InputGroup.Input
          ref={inputRef}
          variant="secondary"
          background={null}
          value={draft}
          onChangeText={setDraft}
          placeholder={t("assist.placeholder")}
          accessibilityLabel={t("assist.placeholder")}
          returnKeyType="send"
          enablesReturnKeyAutomatically
          onSubmitEditing={() => void sendText()}
          autoCapitalize="sentences"
          onFocus={onFocus}
          onBlur={onBlur}
          className="rounded-full"
        />
        <InputGroup.Suffix className="px-1">
          <Button
            variant="primary"
            size="sm"
            isIconOnly
            isDisabled={!canSend}
            accessibilityLabel={t("assist.send")}
            onPress={() => void sendText()}
          >
            <Icon
              name="arrow-up"
              size={18}
              className="text-accent-foreground"
            />
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
    </View>
  );
}

function AssistStatus({ phase }: { phase: AssistPhase }) {
  const t = useT();
  const status = phaseLabel(phase, t);
  if (!status) return null;

  if (phase === "thinking") {
    return (
      <View className="flex-row items-center gap-2 px-1 pt-1">
        <Spinner size="sm" />
        <Text className="text-muted text-xs">{status}</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center px-1 pt-1">
      <Chip
        size="sm"
        variant="soft"
        color={phase === "listening" ? "accent" : "default"}
        pointerEvents="none"
      >
        <Chip.Label>{status}</Chip.Label>
      </Chip>
    </View>
  );
}

/**
 * Kept in a child of the sheet so the pipeline subscription and the microphone
 * only exist while Assist is on screen.
 */
function AssistConversation() {
  const t = useT();
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
  const emptyCopy = t(
    wakeEnabled || phase === "wake" ? "assist.emptyWake" : "assist.empty",
  );

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 pb-3">
        <View className="size-9 items-center justify-center rounded-full bg-accent/15">
          <Icon name="sparkles" size={18} className="text-accent" />
        </View>
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
            accessibilityState={{ selected: wakeEnabled }}
            onPress={toggleWake}
          >
            <Icon
              name="ear"
              size={18}
              className={
                wakeEnabled ? "text-accent-foreground" : "text-foreground"
              }
            />
          </Button>
        ) : null}
        <BottomSheet.Close accessibilityLabel={t("assist.close")} />
      </View>

      <BottomSheetScrollView
        ref={scrollRef}
        contentContainerClassName="grow gap-2.5 py-2"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View className="items-center justify-center gap-3 px-6 py-16">
            <View className="size-16 items-center justify-center rounded-full bg-accent/15">
              <Icon name="sparkles" size={28} className="text-accent" />
            </View>
            <Text className="text-muted text-center text-sm leading-6">
              {emptyCopy}
            </Text>
            <AssistStatus phase={phase} />
          </View>
        ) : (
          <>
            {messages.map((bubble) => {
              const styles = bubbleClasses(bubble.kind);
              return (
                <View key={bubble.id} className={styles.row}>
                  <View
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${styles.bubble}`}
                  >
                    <Text className={`text-sm leading-5 ${styles.text}`}>
                      {bubble.text}
                    </Text>
                  </View>
                </View>
              );
            })}
            <AssistStatus phase={phase} />
          </>
        )}
      </BottomSheetScrollView>

      <AssistComposer
        draft={draft}
        setDraft={setDraft}
        listening={listening}
        sendText={sendText}
        toggleMic={toggleMic}
      />
    </View>
  );
}

export function AssistSheet({ isOpen, onOpenChange }: AssistSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={SNAP_POINTS}
          enableOverDrag={false}
          enableDynamicSizing={false}
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          enableBlurKeyboardOnGesture
          contentContainerClassName="h-full"
          contentContainerProps={{ style: { paddingBottom: 8 } }}
        >
          {isOpen ? <AssistConversation /> : null}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
