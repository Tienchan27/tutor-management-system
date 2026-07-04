package com.example.tms.util;

import java.util.List;

/** Single source of truth for a class's effective display name. */
public final class ClassDisplayNames {
    private ClassDisplayNames() {
    }

    /**
     * The explicit display name if one is set, otherwise a derived
     * {@code "[Subject] Student A - Student B"} (or {@code "[Subject] Class"} when empty).
     */
    public static String resolve(String displayName, String subjectName, List<String> studentNames) {
        if (displayName != null && !displayName.isBlank()) {
            return displayName.trim();
        }
        if (studentNames == null || studentNames.isEmpty()) {
            return "[" + subjectName + "] Class";
        }
        return "[" + subjectName + "] " + String.join(" - ", studentNames);
    }
}
