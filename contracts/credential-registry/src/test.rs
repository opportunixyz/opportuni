extern crate std;

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation, MockAuth, MockAuthInvoke},
    BytesN, Env, IntoVal,
};

fn setup() -> (Env, CredentialRegistryClient<'static>, Address) {
    let env = Env::default();
    let issuer = Address::generate(&env);
    let id = env.register(CredentialRegistry, (issuer.clone(),));
    let client = CredentialRegistryClient::new(&env, &id);
    (env, client, issuer)
}

fn h(env: &Env, b: u8) -> BytesN<32> {
    BytesN::from_array(env, &[b; 32])
}

#[test]
fn issue_pide_firma_del_emisor_y_del_sujeto() {
    let (env, client, issuer) = setup();
    env.mock_all_auths();
    let joven = Address::generate(&env);
    let kind = symbol_short!("vacante");

    let id = client.issue(&joven, &kind, &h(&env, 1));
    assert_eq!(id, 0);

    let auths = env.auths();
    assert_eq!(auths.len(), 2);
    let invocacion = AuthorizedInvocation {
        function: AuthorizedFunction::Contract((
            client.address.clone(),
            Symbol::new(&env, "issue"),
            (joven.clone(), kind.clone(), h(&env, 1)).into_val(&env),
        )),
        sub_invocations: std::vec![],
    };
    assert!(auths.contains(&(issuer.clone(), invocacion.clone())));
    assert!(auths.contains(&(joven.clone(), invocacion)));

    assert_eq!(client.issue(&joven, &symbol_short!("cv_verif"), &h(&env, 2)), 1);
    assert_eq!(client.count(&joven), 2);
    let lista = client.list(&joven, &0);
    assert_eq!(lista.len(), 2);
    assert_eq!(lista.get(1).unwrap().kind, symbol_short!("cv_verif"));
    assert!(!lista.get(0).unwrap().revoked);
}

#[test]
#[should_panic]
fn issue_sin_firma_del_sujeto_falla() {
    let (env, client, issuer) = setup();
    let joven = Address::generate(&env);
    let kind = symbol_short!("vacante");
    let hash = h(&env, 1);
    env.mock_auths(&[MockAuth {
        address: &issuer,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "issue",
            args: (joven.clone(), kind.clone(), hash.clone()).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    client.issue(&joven, &kind, &hash);
}

#[test]
#[should_panic]
fn issue_sin_firma_del_emisor_falla() {
    let (env, client, _issuer) = setup();
    let joven = Address::generate(&env);
    let kind = symbol_short!("vacante");
    let hash = h(&env, 1);
    env.mock_auths(&[MockAuth {
        address: &joven,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "issue",
            args: (joven.clone(), kind.clone(), hash.clone()).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    client.issue(&joven, &kind, &hash);
}

#[test]
fn revoke_marca_y_no_repite() {
    let (env, client, _issuer) = setup();
    env.mock_all_auths();
    let joven = Address::generate(&env);
    let id = client.issue(&joven, &symbol_short!("vacante"), &h(&env, 3));
    client.revoke(&joven, &id);
    assert!(client.get(&joven, &id).revoked);
    assert_eq!(client.try_revoke(&joven, &id), Err(Ok(Error::AlreadyRevoked)));
    assert_eq!(client.try_get(&joven, &9), Err(Ok(Error::NotFound)));
}

#[test]
fn list_pagina_de_50() {
    let (env, client, _issuer) = setup();
    env.mock_all_auths();
    let joven = Address::generate(&env);
    for i in 0..55u8 {
        client.issue(&joven, &symbol_short!("vacante"), &h(&env, i));
    }
    assert_eq!(client.list(&joven, &0).len(), 50);
    let resto = client.list(&joven, &50);
    assert_eq!(resto.len(), 5);
    assert_eq!(resto.get(4).unwrap().id, 54);
    assert_eq!(client.list(&joven, &100).len(), 0);
}

#[test]
fn set_issuer_rota_la_llave() {
    let (env, client, _issuer) = setup();
    env.mock_all_auths();
    let nuevo = Address::generate(&env);
    client.set_issuer(&nuevo);
    assert_eq!(client.issuer(), nuevo);
}
