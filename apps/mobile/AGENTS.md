# Mobile UI

`heroui-native` is the UI kit for this app.

When adding or changing a screen, reach for a HeroUI Native component first. Button, Card, Chip, Dialog, Input, Label, LinkButton, Spinner, Tabs, Text, TextField, and the rest of the package beat a local View / Pressable / Text / Alert.

Write a local primitive only when HeroUI Native has no match. Page chrome (`Screen`) and iOS 26 liquid glass (`GlassSurface`) are the current exceptions.

Check the installed `heroui-native` exports before inventing a control. The package is the source of truth, not this file.
