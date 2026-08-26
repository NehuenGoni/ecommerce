import { Navigate, Route, Routes } from "react-router-dom";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Layout } from "@/components/layout/Layout";
import { CartPage } from "@/pages/CartPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { Home } from "@/pages/Home";
import { LoginPage } from "@/pages/LoginPage";
import { NotFound } from "@/pages/NotFound";
import { OrderConfirmationPage } from "@/pages/OrderConfirmationPage";
import { ProductPage } from "@/pages/ProductPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { AddressesPage } from "@/pages/account/AddressesPage";
import { OrderDetailPage } from "@/pages/account/OrderDetailPage";
import { OrdersListPage } from "@/pages/account/OrdersListPage";
import { ProfilePage } from "@/pages/account/ProfilePage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="categoria/:slug" element={<CatalogPage />} />
        <Route path="buscar" element={<CatalogPage />} />
        <Route path="productos/:slug" element={<ProductPage />} />
        <Route path="carrito" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="pedidos/:id" element={<OrderConfirmationPage />} />
        <Route path="cuenta" element={<AccountLayout />}>
          <Route index element={<Navigate to="pedidos" replace />} />
          <Route path="pedidos" element={<OrdersListPage />} />
          <Route path="pedidos/:id" element={<OrderDetailPage />} />
          <Route path="direcciones" element={<AddressesPage />} />
          <Route path="datos" element={<ProfilePage />} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
