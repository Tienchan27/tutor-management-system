package com.example.tms;

import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.fail;

class ControllerDtoBoundaryTest {

    private static final String ENTITY_PACKAGE = "com.example.tms.entity.";
    private static final String API_PACKAGE = "com.example.tms.api";

    @Test
    void restControllersDoNotReturnJpaEntities() throws Exception {
        List<String> violations = new ArrayList<>();
        for (Class<?> controller : findRestControllers()) {
            for (Method method : controller.getDeclaredMethods()) {
                if (!isMappedEndpoint(method)) {
                    continue;
                }
                collectEntityReturnViolations(controller, method, violations);
            }
        }
        if (!violations.isEmpty()) {
            fail("Controllers must not return JPA entities:\n" + String.join("\n", violations));
        }
    }

    private static List<Class<?>> findRestControllers() throws ClassNotFoundException {
        List<Class<?>> controllers = new ArrayList<>();
        String[] names = {
                "com.example.tms.api.AuthController",
                "com.example.tms.api.UserController",
                "com.example.tms.api.BankAccountController",
                "com.example.tms.api.NotificationController",
                "com.example.tms.api.DashboardController",
                "com.example.tms.api.AdminClassController",
                "com.example.tms.api.ClassMarketplaceController",
                "com.example.tms.api.AdminTutorController",
                "com.example.tms.api.SessionController",
                "com.example.tms.api.PayoutController",
                "com.example.tms.api.AdminInvoiceController",
                "com.example.tms.api.StudentPortalController",
                "com.example.tms.api.BankCatalogController",
                "com.example.tms.api.CenterBankAccountController"
        };
        for (String name : names) {
            Class<?> type = Class.forName(name);
            if (type.isAnnotationPresent(RestController.class)) {
                controllers.add(type);
            }
        }
        return controllers;
    }

    private static boolean isMappedEndpoint(Method method) {
        return method.isAnnotationPresent(GetMapping.class)
                || method.isAnnotationPresent(PostMapping.class)
                || method.isAnnotationPresent(PutMapping.class)
                || method.isAnnotationPresent(PatchMapping.class)
                || method.isAnnotationPresent(DeleteMapping.class)
                || method.isAnnotationPresent(RequestMapping.class);
    }

    private static void collectEntityReturnViolations(Class<?> controller, Method method, List<String> violations) {
        Type returnType = method.getGenericReturnType();
        for (Class<?> raw : extractRawTypes(returnType)) {
            if (raw.getName().startsWith(ENTITY_PACKAGE)) {
                violations.add(controller.getSimpleName() + "#" + method.getName() + " -> " + raw.getName());
            }
        }
    }

    private static List<Class<?>> extractRawTypes(Type type) {
        List<Class<?>> types = new ArrayList<>();
        if (type instanceof Class<?> clazz) {
            if (void.class.equals(clazz) || Void.class.equals(clazz)) {
                return types;
            }
            types.add(clazz);
            return types;
        }
        if (type instanceof ParameterizedType parameterizedType) {
            Type raw = parameterizedType.getRawType();
            if (raw instanceof Class<?> rawClass) {
                String name = rawClass.getName();
                if (name.startsWith("java.") || name.startsWith("org.springframework.http.")) {
                    for (Type arg : parameterizedType.getActualTypeArguments()) {
                        types.addAll(extractRawTypes(arg));
                    }
                    return types;
                }
                types.add(rawClass);
            }
            for (Type arg : parameterizedType.getActualTypeArguments()) {
                types.addAll(extractRawTypes(arg));
            }
        }
        return types;
    }
}
