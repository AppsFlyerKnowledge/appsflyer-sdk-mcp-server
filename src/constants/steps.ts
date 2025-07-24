export const steps = {
  integrateAppsFlyerSdk: {
    regular: [
      `⚠️ Use exactly as written below. Do not modify.\n`,

      `**1. Declare repositories**  
In the **Project** \`build.gradle\` file, declare the \`mavenCentral()\` repository:

\`\`\`gradle
repositories {
  mavenCentral()
}
\`\`\``,

      `**2. Add Dependencies**  
In the **Application** \`build.gradle\` file, add the latest SDK package:

\`\`\`gradle
dependencies { 
  // Get the latest version from https://mvnrepository.com/artifact/com.appsflyer/af-android-sdk 
  implementation 'com.appsflyer:af-android-sdk'
}
\`\`\``,

      `**3. Setting required permissions**  
Add the following permissions inside your \`AndroidManifest.xml\`:

\`\`\`xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
\`\`\``,

      `**4. Start SDK**  
In your global \`Application\` class, import:

\`\`\`java
import com.appsflyer.AppsFlyerLib;
\`\`\``,

      `**5. Add DebugLog before init**  
Inside the \`onCreate()\` method of your \`Application\` class, call:

\`\`\`java
AppsFlyerLib.getInstance().setDebugLog(true);
\`\`\``,

      `**6. Initialize the SDK**  
Inside the \`onCreate()\` method of your \`Application\` class, call:

\`\`\`java
AppsFlyerLib.getInstance().init("<YOUR-DEV-KEY>", null, this);
\`\`\``,

      `**7. Start the SDK**  
Immediately after \`init()\`, call:

\`\`\`java
AppsFlyerLib.getInstance().start(this);
\`\`\``,

      `✅ **Done!**  
Now that the SDK is integrated, you can verify that it's working properly.

🚀 **Next step:**  
Launch your app on a real or virtual device to let the AppsFlyer SDK initialize and send logs.

🔍 **Then:**  
Run the **verifyAppsFlyerSdk** tool to confirm the integration was successful and data is being sent correctly.`
    ],

    withResponseListener: [
      `⚠️ Use exactly as written below. Do not modify.\n`,

      `**1. Declare repositories**  
In the **Project** \`build.gradle\` file, declare the \`mavenCentral()\` repository:

\`\`\`gradle
repositories {
  mavenCentral()
}
\`\`\``,

      `**2. Add Dependencies**  
In the **Application** \`build.gradle\` file, add the latest SDK package:

\`\`\`gradle
dependencies { 
  // Get the latest version from https://mvnrepository.com/artifact/com.appsflyer/af-android-sdk 
  implementation 'com.appsflyer:af-android-sdk'
}
\`\`\``,

      `**3. Setting required permissions**  
Add the following permissions inside your \`AndroidManifest.xml\`:

\`\`\`xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
\`\`\``,

      `**4. Start SDK**  
In your global \`Application\` class, import:

\`\`\`java
import com.appsflyer.AppsFlyerLib;
\`\`\``,

      `**5. Add DebugLog before init**  
Inside the \`onCreate()\` method of your \`Application\` class, call:

\`\`\`java
AppsFlyerLib.getInstance().setDebugLog(true);
\`\`\``,

      `**6. Initialize the SDK**  
Inside the \`onCreate()\` method of your \`Application\` class, call:

\`\`\`java
AppsFlyerLib.getInstance().init("<YOUR-DEV-KEY>", null, this);
\`\`\``,

      `**7. Start the SDK with Response Listener**  
Immediately after \`init()\`, call:

\`\`\`java
AppsFlyerLib.getInstance().start(getApplicationContext(), "<YOUR-DEV-KEY>", new AppsFlyerRequestListener() {
  @Override
  public void onSuccess() {
    // ✅ YOUR CODE UPON SUCCESS
  }

  @Override
  public void onError(int i, @NonNull String s) {
    // ⚠️ YOUR CODE FOR ERROR HANDLING
  }
});
\`\`\`

📝 **Note:** Replace the comment lines with your actual success and error handling logic.`,

      `✅ **Done!**  
Now that the SDK is integrated, you can verify that it's working properly. ! IMPORTANT: let the user know that the debug mode is enabled on the app and show him the code that enables it!

🚀 **Next step:**  
Launch your app on a real or virtual device to let the AppsFlyer SDK initialize and send logs.

🔍 **Then:**  
Run the **verifyAppsFlyerSdk** tool to confirm the integration was successful and data is being sent correctly.`
    ]
  },
  createAppsFlyerLogEvent: (includeListener: boolean): string[] => [
    `🚨 Copy exactly as written below. Do NOT change anything. Every word matters Also do not ask the user for the params values only the keys keep the value as a placeholder!\n`,
  
    `**1. Check if the AppsFlyer SDK is installed**  
  If the SDK is not integrated, ask the user to run the tool:
  👉 \`integrateAppsFlyerSdk\``,
    `**2. Import predefined event names**`,
    `**3. Import predefined event parameter names and Map.** , 
          import com.appsflyer.AFInAppEventType; // Predefined event names,
          import com.appsflyer.AFInAppEventParameterName; // Predefined parameter names
  \`\`\`java
 import java.util.HashMap;
  import java.util.Map;
  \`\`\``,
  
    ...(includeListener
      ? [
          `**4. Import the response listener**  
  \`\`\`java
      import com.appsflyer.AppsFlyerLib;
      import com.appsflyer.attribution.AppsFlyerRequestListener;
  \`\`\``,
  
          `**5. Create a Map and add parameters**  
  \`\`\`java
  Map<String, Object> eventParams = new HashMap<>();

  Map<String, Object> eventValues = new HashMap<String, Object>();
eventValues.put("permater", <<PLACE_HOLDRER_FOR_PARAM_VALUE>>);
AppsFlyerLib.getInstance().logEvent(getApplicationContext(),
      "event name", eventValues,
  \`\`\``,
  
          `**6. Add an event parameter**  
  \`\`\`java
  eventParams.put(AFInAppEventParameterName.CONTENT, "<<PLACE_HOLDRER_FOR_PARAM_VALUE>>");
  \`\`\``,
  
          `**7. Send the event with a listener**  
  \`\`\`java
  AppsFlyerLib.getInstance().logEvent(
    getApplicationContext(),
    <<Event name>>,
    eventParams,
    new AppsFlyerRequestListener() {
      @Override
      public void onSuccess() {
        // YOUR CODE UPON SUCCESS
      }
      @Override
      public void onError(int i, String s) {
        // YOUR CODE FOR ERROR HANDLING
      }
    });
  \`\`\``,
  
        `🚀 Now run your app to trigger the event.  
  🔍 Then run the tool: \`verifyInAppEvent\` to confirm it was received by AppsFlyer.`,
        ]
      : [
          `**4. Create a Map and add parameters**  
  \`\`\`java
  Map<String, Object> eventParams = new HashMap<>();
  \`\`\``,
  
          `**5. Add an event parameter**  
  \`\`\`java
  eventParams.put(AFInAppEventParameterName.CONTENT, "<<PLACE_HOLDRER_FOR_PARAM_VALUE>>");
  \`\`\``,
  
          `**6. Send the event without a listener**  
  \`\`\`java
  AppsFlyerLib.getInstance().logEvent(getApplicationContext(), <<Event name>>, eventParams);
  \`\`\``,
  
        `🚀 Now run your app to trigger the event.  
  🔍 Then run the tool: \`verifyInAppEvent\` to confirm it was received by AppsFlyer.`,
        ]),
  ],
  createDeepLink: (includeUriScheme: boolean, mode: boolean) => {
    if (mode) {
      return [
`🚨 Do not skip. Follow **every** step exactly as shown. Copy-paste as is. Missing even one line will break the deep link.`,
        `1. Make sure the AppsFlyer SDK is integrated in your app.`,
        `2. Add the following code to your AndroidManifest.xml file:
  \`\`\`xml
  <intent-filter android:autoVerify="true">
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data
          android:host="PUT-HERE-ONE-LINK-DOMAIN"
          android:scheme="https" />
  </intent-filter>
  \`\`\``,
        ...(includeUriScheme
          ? [
              `3. (Optional) If you want to support a custom uriScheme, add the following code to your AndroidManifest.xml file as well:
  \`\`\`xml
  <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data
          android:host="SECOND-PART"
          android:scheme="FIRST-PART-OF-SCHEME" />
  </intent-filter>
  \`\`\``,
            ]
          : []),
        `4. Generating a SHA256
  Locate your app's keystore.
  If the app is still in development, locate the debug.keystore.
  - For Windows users: C:\\Users\\USERNAME\\.android\\debug.keystore
  - For Linux or Mac OS users: ~/.android/debug.keystore
  Open the command line and navigate to the folder where the keystore file is located.
  Run the following command (replace KEY_STORE_FILE with your keystore path):
  \`\`\`bash
  keytool -list -v -keystore ~/.android/debug.keystore
  \`\`\`
  Note: The password for the debug.keystore is usually "android".
  The output should look like this: (example output)
  \`\`\`
  Alias name: test
  Creation date: Sep 27, 2017
  Entry type: PrivateKeyEntry
  Certificate chain length: 1
  Certificate[1]:
  Owner: CN=myname
  Issuer: CN=myname
  Serial number: 365ead6d
  Valid from: Wed Sep 27 17:53:32 IDT 2017 until: Sun Sep 21 17:53:32 IDT 2042
  Certificate fingerprints:
  MD5: DB:71:C3:FC:1A:42:ED:06:AC:45:2B:6D:23:F9:F1:24
  SHA1: AE:4F:5F:24:AC:F9:49:07:8D:56:54:F0:33:56:48:F7:FE:3C:E1:60
  SHA256: A9:EA:2F:A7:F1:12:AC:02:31:C3:7A:90:7C:CA:4B:CF:C3:21:6E:A7:F0:0D:60:64:4F:4B:5B:2A:D3:E1:86:C9
  Signature algorithm name: SHA256withRSA
  Version: 3
  Extensions:
  #1: ObjectId: 2.5.29.14 Criticality=false
  SubjectKeyIdentifier [
    KeyIdentifier [
      0000: 34 58 91 8C 02 7F 1A 0F  0D 3B 9F 65 66 D8 E8 65 
      0010: 74 42 2D 44                    
    ]
  ]
  \`\`\`
  Give the SHA256 signature to your marketer.
  Note: Only when the marketer adds the signature to the template can the direct deep linking test be completed.`,
        `5. Import code libraries and subscribe to DeepLinkListener
  
  Import the following libraries:
  
  \`\`\`java
  import com.appsflyer.deeplink.DeepLink;
  import com.appsflyer.deeplink.DeepLinkListener;
  import com.appsflyer.deeplink.DeepLinkResult;
  \`\`\`
  
  Create and subscribe the DeepLinkListener (example, put this in your Application class or similar):
  
  \`\`\`java
  public class ExampleApp extends Application {
      @Override
      public void onCreate() {
          super.onCreate();
  
          AppsFlyerLib.getInstance().subscribeForDeepLink(new DeepLinkListener() {
              @Override
              public void onDeepLinking(@NonNull DeepLinkResult deepLinkResult) {
                  DeepLinkResult.Status dlStatus = deepLinkResult.getStatus();
                  if (dlStatus == DeepLinkResult.Status.NOT_FOUND) {
                      Log.d(LOG_TAG, "Deep link not found");
                      return;
                  } else if (dlStatus == DeepLinkResult.Status.ERROR){
                      DeepLinkResult.Error dlError = deepLinkResult.getError();
                      Log.d(LOG_TAG, "There was an error getting Deep Link data: " + dlError.toString());
                      return;
                  } else {
                      Log.d(LOG_TAG, "Deep link found");
                  }
                  DeepLink deepLinkObj = deepLinkResult.getDeepLink();
                  try {
                      Log.d(LOG_TAG, "The DeepLink data is: " + deepLinkObj.toString());
                      String deepLinkDestination = deepLinkObj.getDeepLinkValue();
                      if(deepLinkObj.isDeferred()) {
                        <YOUR-CODE-FOR-DEFERRED-DEEP-LINK>
                     } else {
                     <YOUR-CODE-FOR-DIRECT-DEEP-LINK>
                    }
                      // Your code for handling the deeplink data here
                  } catch (Exception e) {
                      Log.d(LOG_TAG, "DeepLink data came back null");
                      return;
                  }
              }
          });
      }
  }
  \`\`\`,
  
  ✅ **Done!**  
  Now you creat the deep link, you can verify that it's working properly.
  
  🚀 **Next step:**  
  Launch your app on a real or virtual device to let the AppsFlyer SDK initialize and send logs.
  
  🔍 **Then:**  
  Run the **verifyDeepLink** tool to confirm the deeplink was successful.`, 
      ];
    } else {
      return [
       `1. Import code libraries and subscribe to DeepLinkListener
  
  Import the following libraries:
  
  \`\`\`java
  import com.appsflyer.deeplink.DeepLink;
  import com.appsflyer.deeplink.DeepLinkListener;
  import com.appsflyer.deeplink.DeepLinkResult;
  \`\`\``,
  
  `2. Create and subscribe the DeepLinkListener (example, put this in your Application class or similar):
  
  \`\`\`java
  public class ExampleApp extends Application {
      @Override
      public void onCreate() {
          super.onCreate();
  
          AppsFlyerLib.getInstance().subscribeForDeepLink(new DeepLinkListener() {
              @Override
              public void onDeepLinking(@NonNull DeepLinkResult deepLinkResult) {
                  DeepLinkResult.Status dlStatus = deepLinkResult.getStatus();
                  if (dlStatus == DeepLinkResult.Status.NOT_FOUND) {
                      Log.d(LOG_TAG, "Deep link not found");
                      return;
                  } else if (dlStatus == DeepLinkResult.Status.ERROR){
                      DeepLinkResult.Error dlError = deepLinkResult.getError();
                      Log.d(LOG_TAG, "There was an error getting Deep Link data: " + dlError.toString());
                      return;
                  } else {
                      Log.d(LOG_TAG, "Deep link found");
                  }
                  DeepLink deepLinkObj = deepLinkResult.getDeepLink();
                  try {
                      Log.d(LOG_TAG, "The DeepLink data is: " + deepLinkObj.toString());
                      String deepLinkDestination = deepLinkObj.getDeepLinkValue();
                      if(deepLinkObj.isDeferred()) {
                        <YOUR-CODE-FOR-DEFERRED-DEEP-LINK>
                     } else {
                     <YOUR-CODE-FOR-DIRECT-DEEP-LINK>
                    }
                      // Your code for handling the deeplink data here
                  } catch (Exception e) {
                      Log.d(LOG_TAG, "DeepLink data came back null");
                      return;
                  }
              }
          });
      }
  }
  \`\`\`,
  
  ✅ **Done!**  
  Now you creat the deep link, you can verify that it's working properly.
  
  🚀 **Next step:**  
  Launch your app on a real or virtual device to let the AppsFlyer SDK initialize and send logs.
  
  🔍 **Then:**  
  Run the **verifyDeepLink** tool to confirm the deeplink was successful.`, 
      ];
    }
  }
}  

