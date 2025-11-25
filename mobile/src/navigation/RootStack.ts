// src/navigation/RootStack.ts

export type RootStackParamList = {
  Library: { justUploaded?: boolean } | undefined;
  AddContent: undefined;
  PageDetail: { pageId: string };
  LinkFromQR: undefined;
};

export type ScreenName = keyof RootStackParamList;
