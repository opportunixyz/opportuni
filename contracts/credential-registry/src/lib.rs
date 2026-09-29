#![no_std]

//! Registro de credenciales del Pasaporte Opportuni (PRD 8.4).
//!
//! Opportuni (el emisor) registra credenciales en la cuenta de cada joven.
//! En cadena solo va un hash con salt: nada de nombre, WhatsApp, ciudad,
//! empresa ni puesto (RF15). Emitir pide la firma del emisor y la de la
//! cuenta del joven; la cuenta la autoriza con la regla `CallContract` de
//! este contrato y el signer delegado de Opportuni (PRD 8.3).

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, Address,
    BytesN, ContractExecutable, Env, Symbol, Vec,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Credential {
    pub id: u64,
    pub kind: Symbol,
    pub hash: BytesN<32>,
    pub ts: u64,
    pub revoked: bool,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Issuer,
    Count(Address),
    Cred(Address, u64),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotFound = 1,
    AlreadyRevoked = 2,
    TooMany = 3,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Issued {
    #[topic]
    pub subject: Address,
    pub id: u64,
    pub kind: Symbol,
    pub hash: BytesN<32>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Revoked {
    #[topic]
    pub subject: Address,
    pub id: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssuerChanged {
    pub issuer: Address,
}

/// Máximo de credenciales que `list` devuelve de una vez.
const PAGE: u64 = 50;

const DAY: u32 = 17_280;
const INSTANCE_BUMP: u32 = 120 * DAY;
const INSTANCE_THRESHOLD: u32 = 60 * DAY;

#[contract]
pub struct CredentialRegistry;

fn issuer(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Issuer).unwrap()
}

fn bump(env: &Env) {
    env.storage().instance().extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);
}

fn read(env: &Env, subject: &Address, id: u64) -> Result<Credential, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Cred(subject.clone(), id))
        .ok_or(Error::NotFound)
}

#[contractimpl]
impl CredentialRegistry {
    pub fn __constructor(env: Env, issuer: Address) {
        env.storage().instance().set(&DataKey::Issuer, &issuer);
    }

    /// Registra una credencial. Pide la firma del emisor y la del sujeto.
    pub fn issue(env: Env, subject: Address, kind: Symbol, hash: BytesN<32>) -> u64 {
        // Primero la cuenta del joven: su `__check_auth` pide la firma del
        // emisor (signer delegado) y debe resolverse antes de que el emisor
        // firme la llamada por su lado.
        subject.require_auth();
        issuer(&env).require_auth();

        let count_key = DataKey::Count(subject.clone());
        let id: u64 = env.storage().persistent().get(&count_key).unwrap_or(0);
        let next = id.checked_add(1).unwrap_or_else(|| panic_with_error!(&env, Error::TooMany));

        let cred = Credential {
            id,
            kind: kind.clone(),
            hash: hash.clone(),
            ts: env.ledger().timestamp(),
            revoked: false,
        };
        env.storage().persistent().set(&DataKey::Cred(subject.clone(), id), &cred);
        env.storage().persistent().set(&count_key, &next);
        bump(&env);

        Issued { subject, id, kind, hash }.publish(&env);
        id
    }

    /// Marca una credencial como revocada. Solo el emisor.
    pub fn revoke(env: Env, subject: Address, id: u64) -> Result<(), Error> {
        issuer(&env).require_auth();
        let mut cred = read(&env, &subject, id)?;
        if cred.revoked {
            return Err(Error::AlreadyRevoked);
        }
        cred.revoked = true;
        env.storage().persistent().set(&DataKey::Cred(subject.clone(), id), &cred);
        bump(&env);

        Revoked { subject, id }.publish(&env);
        Ok(())
    }

    pub fn get(env: Env, subject: Address, id: u64) -> Result<Credential, Error> {
        read(&env, &subject, id)
    }

    pub fn count(env: Env, subject: Address) -> u64 {
        env.storage().persistent().get(&DataKey::Count(subject)).unwrap_or(0)
    }

    /// Credenciales del sujeto desde `start`, hasta 50 por página.
    pub fn list(env: Env, subject: Address, start: u64) -> Vec<Credential> {
        let total = Self::count(env.clone(), subject.clone());
        let end = total.min(start.saturating_add(PAGE));
        let mut out = Vec::new(&env);
        let mut i = start;
        while i < end {
            if let Some(c) = env.storage().persistent().get(&DataKey::Cred(subject.clone(), i)) {
                out.push_back(c);
            }
            i += 1;
        }
        out
    }

    pub fn issuer(env: Env) -> Address {
        issuer(&env)
    }

    /// Rota la llave del emisor (si se filtra o se cambia de custodia).
    pub fn set_issuer(env: Env, new_issuer: Address) {
        issuer(&env).require_auth();
        env.storage().instance().set(&DataKey::Issuer, &new_issuer);
        bump(&env);
        IssuerChanged { issuer: new_issuer }.publish(&env);
    }

    /// Actualiza el código del contrato. Solo el emisor.
    pub fn upgrade(env: Env, wasm_hash: BytesN<32>) {
        issuer(&env).require_auth();
        env.deployer()
            .update_current_contract(ContractExecutable::Wasm(wasm_hash));
    }
}

#[cfg(test)]
mod test;
